import os
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")

RESIDENT_EMAIL = "asha@example.com"
RESIDENT_PASSWORD = "pass1234"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=20)
    return r


@pytest.fixture(scope="session")
def resident_token():
    r = _login(RESIDENT_EMAIL, RESIDENT_PASSWORD)
    if r.status_code != 200:
        # try to signup
        requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Asha", "email": RESIDENT_EMAIL, "password": RESIDENT_PASSWORD, "role": "resident"
        }, timeout=20)
        r = _login(RESIDENT_EMAIL, RESIDENT_PASSWORD)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_token():
    r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if r.status_code != 200:
        requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Admin", "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD, "role": "admin"
        }, timeout=20)
        r = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture
def resident_client(resident_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {resident_token}"})
    return s


@pytest.fixture
def admin_client(admin_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {admin_token}"})
    return s
