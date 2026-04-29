"""Iteration 2 tests — Twilio IVR, Google Sheets stub, and area-based supervisor routing."""
import uuid
import requests
import pytest


# ---- Twilio Voice IVR (stub mode — no signature) ----
class TestTwilioVoice:
    def test_voice_default_english(self, base_url, api_client):
        r = requests.post(f"{base_url}/api/twilio/voice",
                          data={"CallSid": "CAtest1", "From": "+15555550100"},
                          timeout=15)
        assert r.status_code == 200, r.text
        body = r.text
        assert "<Response>" in body
        assert "<Gather" in body
        assert 'action="/api/twilio/gather"' in body
        assert "<Say" in body
        # english prompt
        assert "Welcome to Nidhii" in body or "Press 1" in body
        assert "application/xml" in r.headers.get("content-type", "")

    def test_voice_india_hindi(self, base_url):
        r = requests.post(f"{base_url}/api/twilio/voice",
                          data={"CallSid": "CAtest2", "From": "+919999000000", "FromCountry": "IN"},
                          timeout=15)
        assert r.status_code == 200
        body = r.text
        # hindi prompt contains 'Nidhii mein' or 'swagat'
        assert "swagat" in body.lower() or "nidhii mein" in body.lower()

    def test_gather_digit1_returns_record(self, base_url):
        # seed a session first
        sid = "CAtestG1"
        requests.post(f"{base_url}/api/twilio/voice",
                      data={"CallSid": sid, "From": "+15555550101"}, timeout=15)
        r = requests.post(f"{base_url}/api/twilio/gather",
                          data={"CallSid": sid, "Digits": "1"}, timeout=15)
        assert r.status_code == 200
        body = r.text
        assert "<Record" in body
        assert "recordingStatusCallbackMethod=\"POST\"" in body or 'recordingStatusCallbackMethod="POST"' in body

    def test_gather_invalid_digit_replays_menu(self, base_url):
        sid = "CAtestG0"
        requests.post(f"{base_url}/api/twilio/voice",
                      data={"CallSid": sid, "From": "+15555550102"}, timeout=15)
        r = requests.post(f"{base_url}/api/twilio/gather",
                          data={"CallSid": sid, "Digits": "0"}, timeout=15)
        assert r.status_code == 200
        body = r.text
        assert "<Gather" in body  # menu replayed
        assert 'action="/api/twilio/gather"' in body

    def test_recording_done_returns_thankyou_hangup(self, base_url):
        sid = "CAtestRec1"
        requests.post(f"{base_url}/api/twilio/voice",
                      data={"CallSid": sid, "From": "+15555550103"}, timeout=15)
        requests.post(f"{base_url}/api/twilio/gather",
                      data={"CallSid": sid, "Digits": "1"}, timeout=15)
        r = requests.post(f"{base_url}/api/twilio/recording-done",
                         data={
                             "CallSid": sid,
                             "RecordingUrl": "https://api.twilio.com/fake",
                             "RecordingDuration": "5",
                         }, timeout=15)
        assert r.status_code == 200, r.text
        body = r.text
        assert "<Hangup" in body
        assert "<Say" in body


# ---- Admin integrations status & sheets stubs ----
class TestIntegrations:
    def test_status_requires_auth(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/admin/integrations/status")
        assert r.status_code == 401

    def test_status_forbidden_for_resident(self, base_url, resident_client):
        r = resident_client.get(f"{base_url}/api/admin/integrations/status")
        assert r.status_code == 403

    def test_status_admin_returns_stub(self, base_url, admin_client):
        r = admin_client.get(f"{base_url}/api/admin/integrations/status")
        assert r.status_code == 200
        d = r.json()
        assert "twilio" in d and "sheets" in d
        assert d["twilio"]["configured"] is False
        assert d["sheets"]["configured"] is False
        assert d["twilio"]["voice_webhook_path"] == "/api/twilio/voice"
        assert d["twilio"]["gather_webhook_path"] == "/api/twilio/gather"

    def test_sheets_sync_400_when_unconfigured(self, base_url, admin_client):
        r = admin_client.post(f"{base_url}/api/admin/sheets/sync")
        assert r.status_code == 400
        assert "not configured" in r.text.lower()

    def test_sheets_pull_400_when_unconfigured(self, base_url, admin_client):
        r = admin_client.post(f"{base_url}/api/admin/sheets/pull-status")
        assert r.status_code == 400
        assert "not configured" in r.text.lower()


# ---- Area-based supervisor routing ----
SUP_EMAIL = "sup5@example.com"
SUP_PASSWORD = "sup12345"
SUP_AREA = "Sector 5"


def _ensure_supervisor(base_url):
    r = requests.post(f"{base_url}/api/auth/login",
                      json={"email": SUP_EMAIL, "password": SUP_PASSWORD}, timeout=15)
    if r.status_code == 200:
        return r.json()["token"]
    rs = requests.post(f"{base_url}/api/auth/signup", json={
        "name": "Supervisor 5", "email": SUP_EMAIL, "password": SUP_PASSWORD,
        "role": "supervisor", "area": SUP_AREA
    }, timeout=15)
    assert rs.status_code == 200, rs.text
    return rs.json()["token"]


@pytest.fixture(scope="session")
def sup_token(base_url):
    return _ensure_supervisor(base_url)


@pytest.fixture
def sup_client(sup_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {sup_token}"})
    return s


class TestAreaRouting:
    def test_report_stores_area_from_user(self, base_url, api_client):
        # Create a fresh resident in 'Sector 5'
        email = f"TEST_resA_{uuid.uuid4().hex[:6]}@example.com"
        r = api_client.post(f"{base_url}/api/auth/signup", json={
            "name": "Area Resident", "email": email, "password": "pass1234",
            "role": "resident", "area": SUP_AREA,
        })
        assert r.status_code == 200, r.text
        token = r.json()["token"]
        # Create report
        rep = requests.post(f"{base_url}/api/reports",
                            headers={"Authorization": f"Bearer {token}",
                                     "Content-Type": "application/json"},
                            json={"type": "water", "description": "TEST_areaA",
                                  "location": "Sector 5 lane 2"}, timeout=15)
        assert rep.status_code == 200, rep.text
        d = rep.json()
        assert d.get("area") == SUP_AREA

    def test_supervisor_sees_only_own_area(self, base_url, sup_client, admin_client, api_client):
        # Create another resident in 'Sector 9' with at least one report (different area)
        email = f"TEST_resB_{uuid.uuid4().hex[:6]}@example.com"
        rs = api_client.post(f"{base_url}/api/auth/signup", json={
            "name": "Other Area", "email": email, "password": "pass1234",
            "role": "resident", "area": "Sector 9",
        })
        assert rs.status_code == 200, rs.text
        token_b = rs.json()["token"]
        requests.post(f"{base_url}/api/reports",
                      headers={"Authorization": f"Bearer {token_b}",
                               "Content-Type": "application/json"},
                      json={"type": "energy", "description": "TEST_areaB",
                            "location": "Sector 9"}, timeout=15)
        # Sup must only see Sector 5
        sr = sup_client.get(f"{base_url}/api/reports/all")
        assert sr.status_code == 200, sr.text
        sup_rows = sr.json()
        assert isinstance(sup_rows, list)
        assert len(sup_rows) >= 1
        for row in sup_rows:
            assert (row.get("area") or "").lower() == SUP_AREA.lower(), \
                f"Supervisor saw out-of-area report: {row}"
        # Admin sees all (including Sector 9 area)
        ar = admin_client.get(f"{base_url}/api/reports/all")
        assert ar.status_code == 200
        all_rows = ar.json()
        areas = {(r.get("area") or "").lower() for r in all_rows}
        assert "sector 9" in areas
        assert len(all_rows) >= len(sup_rows)
