"""Small test DSL: actors (a user + token) that can call the API tersely."""
from __future__ import annotations

import asyncio
import base64
import io
import uuid

from PIL import Image


def run(coro):
    """Run a coroutine from sync test code (for direct DB pokes)."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def png_b64(color=(200, 100, 50), size=(64, 48)) -> str:
    buf = io.BytesIO()
    Image.new("RGB", size, color).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def new_key() -> str:
    return "idem-" + uuid.uuid4().hex


class Actor:
    def __init__(self, client, auth: dict, password: str | None = None):
        self.client = client
        self.token = auth["access_token"]
        self.user_id = auth["user_id"]
        self.org_id = auth["org_id"]
        self.role = auth["role"]
        self.email = auth["email"]
        self.full_name = auth["full_name"]
        self.password = password

    def headers(self, key=None, idem=False):
        h = {"Authorization": f"Bearer {self.token}"}
        if idem or key:
            h["Idempotency-Key"] = key or new_key()
        return h

    # idem=True by default on writes that require it; harmless where not required
    def get(self, path, **kw):
        return self.client.get(path, headers=self.headers(), **kw)

    def post(self, path, json=None, key=None, idem=True):
        return self.client.post(path, json=json, headers=self.headers(key=key, idem=idem))

    def patch(self, path, json=None):
        return self.client.patch(path, json=json, headers=self.headers())

    def put(self, path, json=None):
        return self.client.put(path, json=json, headers=self.headers())

    def delete(self, path):
        return self.client.delete(path, headers=self.headers())

    # ── conveniences ──
    def upload(self, kind="test") -> str:
        r = self.client.post(
            "/api/erp/uploads/inline",
            json={"kind": kind, "content_type": "image/png", "data_base64": png_b64()},
            headers=self.headers(),
        )
        assert r.status_code == 200, r.text
        return r.json()["object_key"]

    def project(self, code=None, **extra) -> dict:
        code = code or ("P" + uuid.uuid4().hex[:6]).upper()
        body = {"code": code, "name": f"Project {code}", **extra}
        r = self.post("/api/erp/projects", body, idem=False)
        assert r.status_code == 200, r.text
        return r.json()


def signup(client, org="Acme Builders", password="Passw0rd!x") -> Actor:
    email = f"owner-{uuid.uuid4().hex[:10]}@example.com"
    r = client.post("/api/erp/auth/signup", json={
        "email": email, "password": password,
        "full_name": "Olivia Owner", "org_name": org,
    })
    assert r.status_code == 200, r.text
    return Actor(client, r.json(), password)


def add_member(owner: Actor, role: str, full_name: str | None = None) -> Actor:
    email = f"{role.lower()}-{uuid.uuid4().hex[:10]}@example.com"
    password = "TempPass#1234"
    r = owner.post("/api/erp/users/invite", {
        "email": email, "full_name": full_name or f"{role.title()} Person",
        "role": role, "temp_password": password,
    }, idem=False)
    assert r.status_code == 200, r.text
    lr = owner.client.post("/api/erp/auth/login", json={"email": email, "password": password})
    assert lr.status_code == 200, lr.text
    return Actor(owner.client, lr.json(), password)
