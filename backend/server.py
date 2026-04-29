"""Nidhii — Community Accountability System Backend."""
import os
import io
import csv
import uuid
import logging
import jwt
import bcrypt
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Header, Request
from fastapi.responses import StreamingResponse, Response, PlainTextResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from services import sheets as sheets_svc
from services import twilio_ivr

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# DB
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "dev")
JWT_ALGO = "HS256"
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

app = FastAPI(title="Nidhii API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nidhii")

# ---------- helpers ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False

def make_token(uid: str, role: str) -> str:
    payload = {"uid": uid, "role": role, "exp": datetime.now(timezone.utc) + timedelta(days=14)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing token")
    try:
        data = jwt.decode(authorization.split()[1], JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"id": data["uid"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

async def admin_only(user=Depends(current_user)):
    if user.get("role") not in ("admin", "supervisor"):
        raise HTTPException(403, "Admin required")
    return user

# ---------- models ----------
class SignupIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    area: Optional[str] = None
    language: Optional[str] = "en"
    role: Optional[Literal["resident", "supervisor", "admin"]] = "resident"

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ReportIn(BaseModel):
    type: Literal["water", "energy", "waste", "other"]
    description: str
    location: str
    name: Optional[str] = None
    language: Optional[str] = "en"
    source: Optional[Literal["web", "ivr", "voice"]] = "web"
    audio_transcript: Optional[str] = None

class VerifyIn(BaseModel):
    status: Literal["verified", "rejected", "pending"]
    notes: Optional[str] = None

class ChatIn(BaseModel):
    message: str
    language: str = "en"
    session_id: Optional[str] = None

class IVRStepIn(BaseModel):
    digit: str
    session_id: Optional[str] = None

# ---------- auth ----------
@api.post("/auth/signup")
async def signup(body: SignupIn):
    if await db.users.find_one({"email": body.email}):
        raise HTTPException(400, "Email already registered")
    uid = str(uuid.uuid4())
    user = {
        "id": uid,
        "name": body.name,
        "email": body.email,
        "phone": body.phone,
        "area": body.area,
        "language": body.language or "en",
        "role": body.role or "resident",
        "password": hash_pw(body.password),
        "points": 0,
        "rewards_earned": 0,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user)
    token = make_token(uid, user["role"])
    user.pop("password")
    user.pop("_id", None)
    await sheets_svc.upsert_user(user)
    return {"token": token, "user": user}

@api.post("/auth/login")
async def login(body: LoginIn):
    u = await db.users.find_one({"email": body.email})
    if not u or not verify_pw(body.password, u["password"]):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(u["id"], u["role"])
    u.pop("password", None)
    u.pop("_id", None)
    return {"token": token, "user": u}

@api.get("/auth/me")
async def me(user=Depends(current_user)):
    return user

# ---------- reports ----------
@api.post("/reports")
async def create_report(body: ReportIn, user=Depends(current_user)):
    rid = str(uuid.uuid4())
    doc = {
        "id": rid,
        "user_id": user["id"],
        "user_name": user.get("name"),
        "area": user.get("area") or "",
        "type": body.type,
        "description": body.description,
        "location": body.location,
        "language": body.language or "en",
        "source": body.source or "web",
        "audio_transcript": body.audio_transcript,
        "status": "pending",
        "verified_by": None,
        "notes": None,
        "created_at": now_iso(),
    }
    await db.reports.insert_one(doc)
    doc.pop("_id", None)
    await sheets_svc.upsert_report(doc)
    return doc

@api.get("/reports")
async def list_reports(
    mine: bool = False,
    status: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 100,
    user=Depends(current_user),
):
    q = {}
    if mine:
        q["user_id"] = user["id"]
    if status:
        q["status"] = status
    if type:
        q["type"] = type
    rows = await db.reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return rows

@api.get("/reports/all")
async def all_reports(limit: int = 200, user=Depends(admin_only)):
    q = {}
    # Area-based routing: supervisors only see reports from their area; admins see all.
    if user.get("role") == "supervisor" and user.get("area"):
        q["area"] = {"$regex": f"^{user['area']}$", "$options": "i"}
    rows = await db.reports.find(q, {"_id": 0}).sort("created_at", -1).to_list(limit)
    return rows

@api.patch("/reports/{rid}/verify")
async def verify_report(rid: str, body: VerifyIn, user=Depends(admin_only)):
    r = await db.reports.find_one({"id": rid}, {"_id": 0})
    if not r:
        raise HTTPException(404, "Not found")
    prev_status = r["status"]
    await db.reports.update_one(
        {"id": rid},
        {"$set": {"status": body.status, "notes": body.notes, "verified_by": user["id"], "verified_at": now_iso()}},
    )
    # Update user points if newly verified
    if body.status == "verified" and prev_status != "verified":
        await db.users.update_one({"id": r["user_id"]}, {"$inc": {"points": 1}})
        # Award rupees: every 25 verified reports = ₹10
        u = await db.users.find_one({"id": r["user_id"]}, {"_id": 0})
        if u and u["points"] % 25 == 0:
            await db.users.update_one({"id": r["user_id"]}, {"$inc": {"rewards_earned": 10}})
    # Sync to sheets (best-effort)
    updated = await db.reports.find_one({"id": rid}, {"_id": 0})
    if updated:
        await sheets_svc.upsert_report(updated)
    if body.status == "verified" and prev_status != "verified":
        ufresh = await db.users.find_one({"id": r["user_id"]}, {"_id": 0, "password": 0})
        if ufresh:
            await sheets_svc.upsert_user(ufresh)
    return {"ok": True}

# ---------- stats ----------
@api.get("/stats/overview")
async def stats_overview():
    total = await db.reports.count_documents({})
    verified = await db.reports.count_documents({"status": "verified"})
    pending = await db.reports.count_documents({"status": "pending"})
    by_type = {}
    for t in ("water", "energy", "waste", "other"):
        by_type[t] = await db.reports.count_documents({"type": t, "status": "verified"})
    users = await db.users.count_documents({})
    return {
        "total_reports": total,
        "verified": verified,
        "pending": pending,
        "by_type": by_type,
        "active_users": users,
        "rupees_distributed": sum([u.get("rewards_earned", 0) async for u in db.users.find({}, {"_id": 0, "rewards_earned": 1})]),
    }

@api.get("/stats/weekly")
async def stats_weekly():
    """Last 7 days of reports grouped by type."""
    end = datetime.now(timezone.utc)
    days = []
    for i in range(6, -1, -1):
        day = end - timedelta(days=i)
        start_iso = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        next_iso = (day.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)).isoformat()
        q_water = {"type": "water", "created_at": {"$gte": start_iso, "$lt": next_iso}}
        q_energy = {"type": "energy", "created_at": {"$gte": start_iso, "$lt": next_iso}}
        q_waste = {"type": "waste", "created_at": {"$gte": start_iso, "$lt": next_iso}}
        days.append({
            "day": day.strftime("%a"),
            "date": day.strftime("%d %b"),
            "water": await db.reports.count_documents(q_water),
            "energy": await db.reports.count_documents(q_energy),
            "waste": await db.reports.count_documents(q_waste),
        })
    return days

@api.get("/stats/leaderboard")
async def leaderboard(limit: int = 5):
    rows = await db.users.find({"role": "resident"}, {"_id": 0, "password": 0}).sort("points", -1).to_list(limit)
    return rows

# ---------- voice (Whisper) ----------
@api.post("/voice/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("en"), user=Depends(current_user)):
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
    except Exception as e:
        raise HTTPException(500, f"Whisper unavailable: {e}")
    raw = await file.read()
    if len(raw) == 0:
        raise HTTPException(400, "Empty audio")
    bio = io.BytesIO(raw)
    bio.name = file.filename or "audio.webm"
    stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
    try:
        resp = await stt.transcribe(file=bio, model="whisper-1", response_format="json", language=language)
        text = getattr(resp, "text", str(resp))
    except Exception as e:
        logger.exception("transcribe failed")
        raise HTTPException(500, f"Transcription failed: {e}")
    # Heuristic parse: name, address, issue from "My name is X. I live at Y. The issue is Z."
    parsed = parse_voice_report(text)
    return {"transcript": text, "parsed": parsed}

def parse_voice_report(text: str) -> dict:
    """Naive English parser for name/address/issue from a free voice complaint."""
    t = text.lower()
    name = address = issue = ""
    # name
    for marker in ["my name is ", "i am ", "this is ", "mera naam "]:
        if marker in t:
            idx = t.index(marker) + len(marker)
            chunk = text[idx:].split(".")[0].split(",")[0]
            name = chunk.strip().title()[:60]
            break
    # address
    for marker in ["i live at ", "i live in ", "address is ", "from ", "main rehta hoon ", "rehta hoon "]:
        if marker in t:
            idx = t.index(marker) + len(marker)
            chunk = text[idx:].split(".")[0]
            address = chunk.strip()[:120]
            break
    # issue keyword detection
    type_ = "other"
    for kw, typ in [("leak", "water"), ("water", "water"), ("paani", "water"),
                    ("electric", "energy"), ("light", "energy"), ("bijli", "energy"),
                    ("garbage", "waste"), ("trash", "waste"), ("waste", "waste"),
                    ("kachra", "waste"), ("dump", "waste")]:
        if kw in t:
            type_ = typ
            break
    issue = text.strip()[:300]
    return {"name": name, "address": address, "issue": issue, "type": type_}

# ---------- AI Chat (Gemini) ----------
@api.post("/chat")
async def chat(body: ChatIn, user=Depends(current_user)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception as e:
        raise HTTPException(500, f"Chat unavailable: {e}")
    sid = body.session_id or str(uuid.uuid4())
    lang_map = {
        "en": "English", "hi": "Hindi", "ta": "Tamil",
        "te": "Telugu", "bn": "Bengali", "mr": "Marathi",
    }
    lang_name = lang_map.get(body.language, "English")
    system = (
        f"You are Nidhii Sahayak — a warm, simple community assistant for residents of Indian "
        f"informal settlements. Always respond in {lang_name}. Use very short sentences (max 2-3). "
        f"Help users report water leaks, electricity waste, garbage dumping, and explain how to earn "
        f"rewards (₹10 per 25 verified reports). Be encouraging, never patronizing."
    )
    chat_obj = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=sid, system_message=system).with_model("gemini", "gemini-3-flash-preview")
    try:
        msg = UserMessage(text=body.message)
        resp = await chat_obj.send_message(msg)
    except Exception as e:
        logger.exception("chat failed")
        raise HTTPException(500, f"Chat error: {e}")
    # persist
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": sid,
        "user_id": user["id"],
        "role": "user",
        "text": body.message,
        "language": body.language,
        "created_at": now_iso(),
    })
    await db.chat_messages.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": sid,
        "user_id": user["id"],
        "role": "assistant",
        "text": str(resp),
        "language": body.language,
        "created_at": now_iso(),
    })
    return {"reply": str(resp), "session_id": sid}

# ---------- IVR simulator ----------
IVR_TREE = {
    "root": {
        "prompt_en": "Welcome to Nidhii. Press 1 for water issues. 2 for electricity. 3 for waste. 4 to speak with a supervisor. 9 to record a complaint.",
        "prompt_hi": "Nidhii mein aapka swagat hai. Paani ki samasya ke liye 1 dabaayein. Bijli ke liye 2. Kachra ke liye 3. Supervisor se baat karne ke liye 4. Shikayat record karne ke liye 9.",
    }
}

@api.post("/ivr/start")
async def ivr_start(language: str = "en", user=Depends(current_user)):
    sid = str(uuid.uuid4())
    await db.ivr_sessions.insert_one({
        "id": sid, "user_id": user["id"], "language": language,
        "started_at": now_iso(), "events": [],
    })
    prompt = IVR_TREE["root"][f"prompt_{language}"] if f"prompt_{language}" in IVR_TREE["root"] else IVR_TREE["root"]["prompt_en"]
    return {"session_id": sid, "prompt": prompt, "options": ["1", "2", "3", "4", "9"]}

@api.post("/ivr/step")
async def ivr_step(body: IVRStepIn, user=Depends(current_user)):
    digit = body.digit
    responses = {
        "1": "You selected Water. Please describe the leak after the beep, or press 9 to record.",
        "2": "You selected Electricity. Please describe the issue after the beep.",
        "3": "You selected Waste. Please describe the location of the garbage.",
        "4": "Connecting you to your area supervisor. Please hold...",
        "9": "Recording started. Speak now. Press # to stop.",
    }
    msg = responses.get(digit, "Invalid option. Please try again.")
    if body.session_id:
        await db.ivr_sessions.update_one(
            {"id": body.session_id},
            {"$push": {"events": {"digit": digit, "at": now_iso()}}},
        )
    return {"prompt": msg, "expects_voice": digit in ("1", "2", "3", "9")}

# ---------- Admin: CSV export ----------
@api.get("/admin/export/reports.csv")
async def export_reports(user=Depends(admin_only)):
    rows = await db.reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(10000)
    buf = io.StringIO()
    fields = ["id", "user_name", "type", "status", "location", "description", "language", "source", "created_at"]
    w = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nidhii-reports.csv"},
    )

@api.get("/admin/export/users.csv")
async def export_users(user=Depends(admin_only)):
    rows = await db.users.find({}, {"_id": 0, "password": 0}).to_list(10000)
    buf = io.StringIO()
    fields = ["id", "name", "email", "phone", "area", "role", "language", "points", "rewards_earned", "created_at"]
    w = csv.DictWriter(buf, fieldnames=fields, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow(r)
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nidhii-users.csv"},
    )

# ---------- Twilio IVR webhooks ----------
PUBLIC_BASE = os.environ.get("PUBLIC_BASE_URL")  # optional; defaults to request.url

async def _twilio_validate(req: Request) -> bool:
    """Validate Twilio signature against the actual public URL."""
    sig = req.headers.get("X-Twilio-Signature", "")
    form = await req.form()
    params = {k: v for k, v in form.items()}
    url = PUBLIC_BASE.rstrip("/") + req.url.path if PUBLIC_BASE else str(req.url)
    if "?" in str(req.url) and "?" not in url:
        url = url + "?" + str(req.url).split("?", 1)[1]
    return twilio_ivr.validate_signature(url, params, sig), params


@api.post("/twilio/voice")
async def twilio_voice(request: Request):
    """Inbound call entry — returns IVR greeting + DTMF gather TwiML."""
    ok, params = await _twilio_validate(request)
    if not ok:
        raise HTTPException(403, "Invalid Twilio signature")
    call_sid = params.get("CallSid", "unknown")
    from_num = params.get("From", "")
    language = "hi" if params.get("FromCountry", "") == "IN" else "en"
    await db.ivr_sessions.insert_one({
        "id": str(uuid.uuid4()),
        "call_sid": call_sid, "from_number": from_num,
        "language": language, "started_at": now_iso(),
        "channel": "twilio",
    })
    return Response(
        content=twilio_ivr.greeting_twiml(language=language, action_url="/api/twilio/gather"),
        media_type="application/xml",
    )


@api.post("/twilio/gather")
async def twilio_gather(request: Request):
    ok, params = await _twilio_validate(request)
    if not ok:
        raise HTTPException(403, "Invalid Twilio signature")
    digit = params.get("Digits", "")
    call_sid = params.get("CallSid", "")
    sess = await db.ivr_sessions.find_one({"call_sid": call_sid}, {"_id": 0})
    language = (sess or {}).get("language", "en")
    code, label = twilio_ivr.category_for(digit, language)
    if not code:
        # invalid input — replay menu
        return Response(
            content=twilio_ivr.greeting_twiml(language=language, action_url="/api/twilio/gather"),
            media_type="application/xml",
        )
    await db.ivr_sessions.update_one(
        {"call_sid": call_sid},
        {"$set": {"selected_type": code, "selected_at": now_iso()}},
    )
    return Response(
        content=twilio_ivr.category_record_twiml(
            label, language, "/api/twilio/recording-status",
        ),
        media_type="application/xml",
    )


@api.post("/twilio/recording-done")
async def twilio_recording_done(request: Request):
    """Twilio's immediate recording webhook — store URL, say goodbye."""
    ok, params = await _twilio_validate(request)
    if not ok:
        raise HTTPException(403, "Invalid Twilio signature")
    call_sid = params.get("CallSid", "")
    rec_url = params.get("RecordingUrl", "")
    duration = params.get("RecordingDuration", "0")
    sess = await db.ivr_sessions.find_one({"call_sid": call_sid}, {"_id": 0})
    language = (sess or {}).get("language", "en")
    await db.ivr_sessions.update_one(
        {"call_sid": call_sid},
        {"$set": {"recording_url": rec_url, "recording_duration": duration, "recorded_at": now_iso()}},
    )
    return Response(content=twilio_ivr.thank_you_twiml(language), media_type="application/xml")


@api.post("/twilio/recording-status")
async def twilio_recording_status(request: Request):
    """Async — fires when recording is finalized. Transcribe + create report."""
    ok, params = await _twilio_validate(request)
    if not ok:
        raise HTTPException(403, "Invalid Twilio signature")
    if params.get("RecordingStatus") != "completed":
        return PlainTextResponse("ok")
    call_sid = params.get("CallSid", "")
    rec_url = params.get("RecordingUrl", "")
    sess = await db.ivr_sessions.find_one({"call_sid": call_sid}, {"_id": 0})
    if not sess:
        return PlainTextResponse("ok")
    # download audio (Twilio recordings are public mp3 by default at <url>.mp3)
    try:
        import httpx
        import base64
        sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        token = os.environ.get("TWILIO_AUTH_TOKEN", "")
        auth = base64.b64encode(f"{sid}:{token}".encode()).decode() if sid else ""
        headers = {"Authorization": f"Basic {auth}"} if auth else {}
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.get(rec_url + ".mp3", headers=headers)
            audio = r.content
    except Exception:
        logger.exception("recording download failed")
        return PlainTextResponse("ok")
    transcript = ""
    parsed = {}
    try:
        from emergentintegrations.llm.openai import OpenAISpeechToText
        bio = io.BytesIO(audio)
        bio.name = "ivr.mp3"
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        resp = await stt.transcribe(file=bio, model="whisper-1", response_format="json", language=sess.get("language", "en"))
        transcript = getattr(resp, "text", str(resp))
        parsed = parse_voice_report(transcript)
    except Exception as e:
        logger.warning("twilio transcribe failed: %s", e)
    # Create a report. user_id may be None if number not registered.
    user_doc = await db.users.find_one({"phone": sess.get("from_number")}, {"_id": 0, "password": 0})
    rid = str(uuid.uuid4())
    doc = {
        "id": rid,
        "user_id": user_doc["id"] if user_doc else None,
        "user_name": (user_doc or {}).get("name") or parsed.get("name") or sess.get("from_number") or "Unknown caller",
        "area": (user_doc or {}).get("area") or "",
        "type": sess.get("selected_type") or parsed.get("type") or "other",
        "description": transcript or "(no transcript)",
        "location": parsed.get("address") or "Phone caller",
        "language": sess.get("language", "en"),
        "source": "ivr",
        "audio_transcript": transcript,
        "audio_url": rec_url,
        "status": "pending",
        "verified_by": None,
        "notes": None,
        "created_at": now_iso(),
    }
    await db.reports.insert_one(doc)
    doc.pop("_id", None)
    await sheets_svc.upsert_report(doc)
    return PlainTextResponse("ok")


# ---------- Admin: integrations + sheets sync ----------
@api.get("/admin/integrations/status")
async def integrations_status(user=Depends(admin_only)):
    return {
        "twilio": {
            "configured": twilio_ivr.is_configured(),
            "phone_number": os.environ.get("TWILIO_PHONE_NUMBER", "") or None,
            "voice_webhook_path": "/api/twilio/voice",
            "gather_webhook_path": "/api/twilio/gather",
            "recording_status_path": "/api/twilio/recording-status",
        },
        "sheets": {
            "configured": sheets_svc.is_configured(),
            "spreadsheet_id": os.environ.get("GOOGLE_SHEETS_SPREADSHEET_ID", "") or None,
        },
    }


@api.post("/admin/sheets/sync")
async def sheets_full_sync(user=Depends(admin_only)):
    if not sheets_svc.is_configured():
        raise HTTPException(400, "Google Sheets not configured. Add GOOGLE_SHEETS_CREDS_JSON and GOOGLE_SHEETS_SPREADSHEET_ID to backend .env.")
    reports = await db.reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(5000)
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(5000)
    return await sheets_svc.full_sync(reports, users)


@api.post("/admin/sheets/pull-status")
async def sheets_pull(user=Depends(admin_only)):
    """Pull manual status edits from sheet back into Mongo."""
    if not sheets_svc.is_configured():
        raise HTTPException(400, "Google Sheets not configured")
    rows = await db.reports.find({}, {"_id": 0, "id": 1, "status": 1}).to_list(5000)
    overrides = await sheets_svc.read_status_overrides([r["id"] for r in rows])
    changed = 0
    for r in rows:
        if r["id"] in overrides and overrides[r["id"]] in {"pending", "verified", "rejected"} and overrides[r["id"]] != r["status"]:
            await db.reports.update_one({"id": r["id"]}, {"$set": {"status": overrides[r["id"]]}})
            changed += 1
    return {"changed": changed, "checked": len(rows)}


# ---------- root ----------
@api.get("/")
async def root():
    return {"app": "Nidhii", "ok": True}

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
