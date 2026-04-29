"""Google Sheets service-account sync. Gracefully no-ops if creds missing."""
import os
import json
import asyncio
import logging
from typing import Optional, List

logger = logging.getLogger("nidhii.sheets")

REPORT_HEADERS = [
    "id", "created_at", "user_name", "area", "type", "status",
    "location", "description", "language", "source", "verified_by", "notes",
]
USER_HEADERS = [
    "id", "created_at", "name", "email", "phone", "area", "role",
    "language", "points", "rewards_earned",
]


def _get_service():
    """Build the Sheets API client. Returns None if not configured."""
    creds_raw = os.environ.get("GOOGLE_SHEETS_CREDS_JSON", "").strip()
    sheet_id = os.environ.get("GOOGLE_SHEETS_SPREADSHEET_ID", "").strip()
    if not creds_raw or not sheet_id:
        return None, None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        logger.warning("google-api-python-client missing; sync disabled")
        return None, None
    try:
        info = json.loads(creds_raw)
        creds = service_account.Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/spreadsheets"],
        )
        svc = build("sheets", "v4", credentials=creds, cache_discovery=False)
        return svc, sheet_id
    except Exception as e:
        logger.exception("Failed to build sheets service: %s", e)
        return None, None


def is_configured() -> bool:
    svc, sid = _get_service()
    return bool(svc and sid)


def _ensure_headers_sync(svc, sheet_id: str, sheet_name: str, headers: List[str]):
    """Create the tab + header row if missing."""
    try:
        meta = svc.spreadsheets().get(spreadsheetId=sheet_id).execute()
        tabs = [s["properties"]["title"] for s in meta.get("sheets", [])]
        if sheet_name not in tabs:
            svc.spreadsheets().batchUpdate(
                spreadsheetId=sheet_id,
                body={"requests": [{"addSheet": {"properties": {"title": sheet_name}}}]},
            ).execute()
        # write headers in row 1 (idempotent)
        svc.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range=f"{sheet_name}!A1",
            valueInputOption="RAW",
            body={"values": [headers]},
        ).execute()
    except Exception as e:
        logger.exception("ensure_headers failed: %s", e)


def _row_for_report(r: dict) -> List:
    return [r.get(k, "") if r.get(k) is not None else "" for k in REPORT_HEADERS]


def _row_for_user(u: dict) -> List:
    return [u.get(k, "") if u.get(k) is not None else "" for k in USER_HEADERS]


def _append_sync(svc, sheet_id: str, sheet_name: str, row: List):
    svc.spreadsheets().values().append(
        spreadsheetId=sheet_id,
        range=f"{sheet_name}!A1",
        valueInputOption="RAW",
        insertDataOption="INSERT_ROWS",
        body={"values": [row]},
    ).execute()


def _find_row_by_id_sync(svc, sheet_id: str, sheet_name: str, target_id: str) -> Optional[int]:
    res = svc.spreadsheets().values().get(
        spreadsheetId=sheet_id,
        range=f"{sheet_name}!A:A",
    ).execute()
    rows = res.get("values", [])
    for idx, row in enumerate(rows):
        if row and row[0] == target_id:
            return idx + 1  # 1-indexed
    return None


def _upsert_report_sync(svc, sheet_id: str, r: dict):
    _ensure_headers_sync(svc, sheet_id, "Reports", REPORT_HEADERS)
    row = _row_for_report(r)
    found = _find_row_by_id_sync(svc, sheet_id, "Reports", r["id"])
    if found:
        svc.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range=f"Reports!A{found}",
            valueInputOption="RAW",
            body={"values": [row]},
        ).execute()
    else:
        _append_sync(svc, sheet_id, "Reports", row)


def _upsert_user_sync(svc, sheet_id: str, u: dict):
    _ensure_headers_sync(svc, sheet_id, "Users", USER_HEADERS)
    row = _row_for_user(u)
    found = _find_row_by_id_sync(svc, sheet_id, "Users", u["id"])
    if found:
        svc.spreadsheets().values().update(
            spreadsheetId=sheet_id,
            range=f"Users!A{found}",
            valueInputOption="RAW",
            body={"values": [row]},
        ).execute()
    else:
        _append_sync(svc, sheet_id, "Users", row)


async def upsert_report(report: dict):
    svc, sid = _get_service()
    if not svc:
        return
    try:
        await asyncio.to_thread(_upsert_report_sync, svc, sid, report)
    except Exception as e:
        logger.warning("sheets upsert_report failed: %s", e)


async def upsert_user(user: dict):
    svc, sid = _get_service()
    if not svc:
        return
    try:
        await asyncio.to_thread(_upsert_user_sync, svc, sid, user)
    except Exception as e:
        logger.warning("sheets upsert_user failed: %s", e)


async def full_sync(reports: List[dict], users: List[dict]) -> dict:
    """Wipe + re-write Reports & Users tabs."""
    svc, sid = _get_service()
    if not svc:
        return {"ok": False, "reason": "not_configured"}

    def _do():
        for tab, headers, rows in [
            ("Reports", REPORT_HEADERS, [_row_for_report(r) for r in reports]),
            ("Users", USER_HEADERS, [_row_for_user(u) for u in users]),
        ]:
            _ensure_headers_sync(svc, sid, tab, headers)
            svc.spreadsheets().values().clear(
                spreadsheetId=sid, range=f"{tab}!A2:Z",
            ).execute()
            if rows:
                svc.spreadsheets().values().update(
                    spreadsheetId=sid,
                    range=f"{tab}!A2",
                    valueInputOption="RAW",
                    body={"values": rows},
                ).execute()

    try:
        await asyncio.to_thread(_do)
        return {"ok": True, "reports": len(reports), "users": len(users)}
    except Exception as e:
        logger.exception("full_sync failed")
        return {"ok": False, "reason": str(e)}


async def read_status_overrides(report_ids: List[str]) -> dict:
    """Read sheet's status column to detect manual edits. Returns {id: status}."""
    svc, sid = _get_service()
    if not svc:
        return {}
    def _do():
        res = svc.spreadsheets().values().get(
            spreadsheetId=sid, range="Reports!A:F",
        ).execute()
        rows = res.get("values", [])
        if not rows:
            return {}
        # header is row 0; columns: id(0)..status(5)
        wanted = set(report_ids)
        out = {}
        for row in rows[1:]:
            if len(row) >= 6 and row[0] in wanted:
                out[row[0]] = row[5]
        return out
    try:
        return await asyncio.to_thread(_do)
    except Exception as e:
        logger.warning("read_status_overrides failed: %s", e)
        return {}
