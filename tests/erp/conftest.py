"""
ERP backend test harness.

Isolation guarantee: these tests NEVER talk to a real MongoDB. The Motor client
class is replaced with an in-memory mock *before* the ERP modules are imported,
so even a developer with a production MONGO_URL exported in their shell cannot
reach it from here.

Run from the repo root:
    pip install -r backend/requirements.txt -r backend/requirements-dev.txt
    pytest tests/erp -q
"""
import os
import sys
import pathlib

# ── 1. Environment (forced, not setdefault: never inherit a real URL) ────────
os.environ["MONGO_URL"] = "mongodb://localhost:27017"   # never dialled — client is mocked
os.environ["DB_NAME"] = "erp_pytest"
os.environ["ERP_JWT_SECRET"] = "pytest-secret-" + "k" * 32

# ── 2. Swap the Mongo driver for an in-memory mock ───────────────────────────
import motor.motor_asyncio as _motor                      # noqa: E402
from mongomock_motor import AsyncMongoMockClient          # noqa: E402

_motor.AsyncIOMotorClient = AsyncMongoMockClient

# ── 3. Make backend modules importable ───────────────────────────────────────
# ERP_BACKEND_DIR lets a run target another checkout of backend/ (used to A/B the
# tests against a pristine copy of the code and prove they detect the old bugs).
BACKEND = pathlib.Path(
    os.environ.get("ERP_BACKEND_DIR") or pathlib.Path(__file__).resolve().parents[2] / "backend"
)
sys.path.insert(0, str(BACKEND))

import pytest                                             # noqa: E402
from fastapi import FastAPI                               # noqa: E402
from fastapi.testclient import TestClient                 # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _fast_password_hashing():
    """bcrypt is deliberately slow; use 4 rounds in tests only (production keeps the default 12)."""
    import bcrypt
    import erp_routes
    original = erp_routes._hash_password
    erp_routes._hash_password = lambda pw: bcrypt.hashpw(pw.encode(), bcrypt.gensalt(rounds=4)).decode()
    yield
    erp_routes._hash_password = original


@pytest.fixture(scope="session")
def app():
    import erp_api
    application = FastAPI()
    for r in erp_api.routers:
        application.include_router(r)
    return application


@pytest.fixture(scope="session")
def client(app):
    # Context manager => FastAPI startup handlers run (index creation etc.)
    with TestClient(app) as c:
        yield c
