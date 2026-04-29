"""Backend regression tests for Nidhii."""
import io
import time
import uuid
import requests
import pytest

# ---- AUTH ----
class TestAuth:
    def test_signup_resident(self, base_url, api_client):
        email = f"TEST_res_{uuid.uuid4().hex[:8]}@example.com"
        r = api_client.post(f"{base_url}/api/auth/signup", json={
            "name": "Test Resident", "email": email, "password": "pass1234", "role": "resident"
        })
        assert r.status_code == 200, r.text
        data = r.json()
        assert "token" in data and "user" in data
        assert data["user"]["email"] == email
        assert data["user"]["role"] == "resident"
        assert data["user"]["points"] == 0
        assert "password" not in data["user"]

    def test_signup_admin(self, base_url, api_client):
        email = f"TEST_admin_{uuid.uuid4().hex[:8]}@example.com"
        r = api_client.post(f"{base_url}/api/auth/signup", json={
            "name": "Test Admin", "email": email, "password": "pass1234", "role": "admin"
        })
        assert r.status_code == 200, r.text
        assert r.json()["user"]["role"] == "admin"

    def test_signup_duplicate_email(self, base_url, api_client):
        email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        api_client.post(f"{base_url}/api/auth/signup", json={
            "name": "x", "email": email, "password": "pass1234"
        })
        r = api_client.post(f"{base_url}/api/auth/signup", json={
            "name": "x", "email": email, "password": "pass1234"
        })
        assert r.status_code == 400

    def test_login_success(self, base_url, api_client):
        r = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "asha@example.com", "password": "pass1234"
        })
        assert r.status_code == 200, r.text
        assert "token" in r.json()

    def test_login_invalid(self, base_url, api_client):
        r = api_client.post(f"{base_url}/api/auth/login", json={
            "email": "asha@example.com", "password": "wrongpw"
        })
        assert r.status_code == 401

    def test_me_with_token(self, base_url, resident_client):
        r = resident_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 200, r.text
        assert r.json()["email"] == "asha@example.com"

    def test_me_without_token(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401


# ---- REPORTS ----
class TestReports:
    def test_create_report_pending(self, base_url, resident_client):
        payload = {
            "type": "water", "description": "TEST_leak in lane 3",
            "location": "Sector 5", "language": "en", "source": "web",
        }
        r = resident_client.post(f"{base_url}/api/reports", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["status"] == "pending"
        assert d["type"] == "water"
        assert d["user_name"]
        assert "id" in d

    def test_list_reports_mine(self, base_url, resident_client):
        # create one
        resident_client.post(f"{base_url}/api/reports", json={
            "type": "energy", "description": "TEST_streetlight off", "location": "Block A"
        })
        r = resident_client.get(f"{base_url}/api/reports?mine=true")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        # all returned belong to caller
        me = resident_client.get(f"{base_url}/api/auth/me").json()
        for row in rows:
            assert row["user_id"] == me["id"]

    def test_list_filters(self, base_url, resident_client):
        r = resident_client.get(f"{base_url}/api/reports?type=water&status=pending")
        assert r.status_code == 200
        for row in r.json():
            assert row["type"] == "water"
            assert row["status"] == "pending"

    def test_reports_all_forbidden_for_resident(self, base_url, resident_client):
        r = resident_client.get(f"{base_url}/api/reports/all")
        assert r.status_code == 403

    def test_reports_all_admin(self, base_url, admin_client):
        r = admin_client.get(f"{base_url}/api/reports/all")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_verify_increments_points(self, base_url, resident_client, admin_client):
        # baseline points
        me = resident_client.get(f"{base_url}/api/auth/me").json()
        before_points = me["points"]
        before_rewards = me["rewards_earned"]

        # create report
        rep = resident_client.post(f"{base_url}/api/reports", json={
            "type": "waste", "description": "TEST_dump", "location": "Corner Y"
        }).json()
        rid = rep["id"]

        # verify
        r = admin_client.patch(f"{base_url}/api/reports/{rid}/verify",
                               json={"status": "verified", "notes": "ok"})
        assert r.status_code == 200, r.text
        assert r.json().get("ok") is True

        # check points incremented
        me2 = resident_client.get(f"{base_url}/api/auth/me").json()
        assert me2["points"] == before_points + 1
        # rewards may or may not increment depending on multiple of 25
        if me2["points"] % 25 == 0:
            assert me2["rewards_earned"] == before_rewards + 10
        else:
            assert me2["rewards_earned"] == before_rewards

        # idempotency: re-verify same status shouldn't double-increment
        admin_client.patch(f"{base_url}/api/reports/{rid}/verify",
                           json={"status": "verified"})
        me3 = resident_client.get(f"{base_url}/api/auth/me").json()
        assert me3["points"] == me2["points"], "Points should not double-increment for already verified"


# ---- STATS ----
class TestStats:
    def test_overview(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/stats/overview")
        assert r.status_code == 200
        d = r.json()
        for k in ("total_reports", "verified", "pending", "by_type", "active_users", "rupees_distributed"):
            assert k in d
        for t in ("water", "energy", "waste", "other"):
            assert t in d["by_type"]

    def test_weekly(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/stats/weekly")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list) and len(rows) == 7
        for row in rows:
            for k in ("day", "date", "water", "energy", "waste"):
                assert k in row

    def test_leaderboard(self, base_url, api_client):
        r = api_client.get(f"{base_url}/api/stats/leaderboard")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        # sorted desc by points
        if len(rows) >= 2:
            for i in range(len(rows) - 1):
                assert rows[i].get("points", 0) >= rows[i + 1].get("points", 0)
        # only residents
        for u in rows:
            assert u.get("role") == "resident"
            assert "password" not in u


# ---- CHAT (Gemini) ----
class TestChat:
    def test_chat_english(self, base_url, resident_client):
        r = resident_client.post(f"{base_url}/api/chat", json={
            "message": "How do I report a water leak?", "language": "en"
        }, timeout=60)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "reply" in d and isinstance(d["reply"], str) and len(d["reply"]) > 0
        assert "session_id" in d

    def test_chat_hindi_with_session(self, base_url, resident_client):
        r1 = resident_client.post(f"{base_url}/api/chat", json={
            "message": "Namaste", "language": "hi"
        }, timeout=60)
        assert r1.status_code == 200, r1.text
        sid = r1.json()["session_id"]
        r2 = resident_client.post(f"{base_url}/api/chat", json={
            "message": "Paani ki samasya", "language": "hi", "session_id": sid
        }, timeout=60)
        assert r2.status_code == 200
        assert r2.json()["session_id"] == sid


# ---- IVR ----
class TestIVR:
    def test_ivr_flow(self, base_url, resident_client):
        r = resident_client.post(f"{base_url}/api/ivr/start?language=en", json={})
        assert r.status_code == 200, r.text
        d = r.json()
        assert "session_id" in d and "prompt" in d
        assert set(d["options"]) == {"1", "2", "3", "4", "9"}
        sid = d["session_id"]

        s = resident_client.post(f"{base_url}/api/ivr/step", json={"digit": "1", "session_id": sid})
        assert s.status_code == 200
        assert "Water" in s.json()["prompt"]
        assert s.json()["expects_voice"] is True

        s2 = resident_client.post(f"{base_url}/api/ivr/step", json={"digit": "0", "session_id": sid})
        assert s2.status_code == 200
        assert "Invalid" in s2.json()["prompt"]


# ---- VOICE ----
class TestVoice:
    def test_voice_empty_rejected(self, base_url, resident_token):
        # multipart, must not set content-type to json
        files = {"file": ("empty.webm", io.BytesIO(b""), "audio/webm")}
        r = requests.post(f"{base_url}/api/voice/transcribe",
                          headers={"Authorization": f"Bearer {resident_token}"},
                          files=files, data={"language": "en"}, timeout=30)
        # should be 400 for empty audio
        assert r.status_code == 400, f"expected 400 got {r.status_code}: {r.text}"

    def test_voice_unauthenticated(self, base_url):
        files = {"file": ("empty.webm", io.BytesIO(b""), "audio/webm")}
        r = requests.post(f"{base_url}/api/voice/transcribe", files=files, timeout=30)
        assert r.status_code == 401


# ---- ADMIN EXPORT ----
class TestAdminExport:
    def test_export_reports_csv_admin(self, base_url, admin_token):
        r = requests.get(f"{base_url}/api/admin/export/reports.csv",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        first_line = r.text.splitlines()[0]
        assert "id" in first_line and "type" in first_line and "status" in first_line

    def test_export_users_csv_admin(self, base_url, admin_token):
        r = requests.get(f"{base_url}/api/admin/export/users.csv",
                         headers={"Authorization": f"Bearer {admin_token}"}, timeout=30)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        header = r.text.splitlines()[0]
        for col in ("email", "points", "rewards_earned"):
            assert col in header

    def test_export_forbidden_for_resident(self, base_url, resident_token):
        r = requests.get(f"{base_url}/api/admin/export/reports.csv",
                         headers={"Authorization": f"Bearer {resident_token}"}, timeout=30)
        assert r.status_code == 403
