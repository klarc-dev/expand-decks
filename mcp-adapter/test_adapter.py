import base64
import json
from pathlib import Path
import time

import httpx
import pytest
from starlette.testclient import TestClient

from server import create_app
from slides_api import SlidesAPI

SPEC = json.loads(Path(__file__).with_name("openapi.json").read_text())
TOKEN = "adapter-token-" + "a" * 32
ACCEPT = "application/json, text/event-stream"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Accept": ACCEPT}


def client_for(handler, *, writes=False):
    api = SlidesAPI("https://slides.test", "author@example.test", "payload-password",
                    transport=httpx.MockTransport(handler))
    app = create_app(SPEC, api, ingress_token=TOKEN, enable_writes=writes, allowed_host="testserver")
    return TestClient(app)


def rpc(client, method, params=None, headers=HEADERS):
    return client.post("/mcp", headers=headers, json={
        "jsonrpc": "2.0", "id": 1, "method": method, **({"params": params} if params is not None else {}),
    })


def invoke(client, name, **arguments):
    response = rpc(client, "tools/call", {"name": name, "arguments": arguments})
    assert response.status_code == 200, response.text
    return response.json()["result"]


def auth_result(index):
    return httpx.Response(200, json={"token": f"jwt.session{index}.sig", "exp": int(time.time()) + 600},
                          headers={"set-cookie": "payload-token=notused; Path=/"})


def test_protocol_list_projection_and_get_auth_refresh():
    calls = []

    def handler(req):
        calls.append(req)
        assert req.url.host == "slides.test"
        assert "cookie" not in req.headers
        if req.url.path == "/api/users/login":
            assert req.method == "POST" and "authorization" not in req.headers
            assert json.loads(req.content) == {"email": "author@example.test", "password": "payload-password"}
            return auth_result(len(calls))
        assert req.url.path == "/api/presentations" and req.method == "GET"
        assert req.url.params["limit"] == "20"
        assert req.url.params["select[title]"] == "true"
        assert req.url.params["depth"] == "0"
        assert req.headers["authorization"] == f"JWT jwt.session{1 if len(calls) == 2 else 3}.sig"
        return (httpx.Response(401) if len(calls) == 2 else
                httpx.Response(200, json={"docs": [{"title": "Deck", "secret": "not projected"}]}))

    with client_for(handler) as client:
        assert rpc(client, "tools/list", headers={"Accept": ACCEPT}).status_code == 401
        assert rpc(client, "tools/list", headers={"Accept": ACCEPT, "Authorization": "Bearer jwt.session1.sig"}).status_code == 401
        assert rpc(client, "tools/list", headers={**HEADERS, "Host": "unexpected.test"}).status_code == 421
        initialized = rpc(client, "initialize", {"protocolVersion": "2025-11-25", "capabilities": {},
                                                "clientInfo": {"name": "test", "version": "1"}})
        assert initialized.json()["result"]["serverInfo"]["name"] == "Slides"
        tools = {entry["name"]: entry for entry in rpc(client, "tools/list").json()["result"]["tools"]}
        assert "list_decks" in tools and "update_deck" not in tools
        assert tools["preview_slide"]["annotations"]["readOnlyHint"] is True
        assert not calls
        assert invoke(client, "list_decks")["structuredContent"] == {"docs": [{"title": "Deck"}]}
        assert invoke(client, "list_decks")["structuredContent"] == {"docs": [{"title": "Deck"}]}
    assert len(calls) == 5


@pytest.mark.parametrize("status", [401, 503, None])
def test_opt_in_write_is_never_replayed_and_does_not_echo_upstream_errors(status):
    calls = []

    def handler(req):
        calls.append(req)
        if req.url.path == "/api/users/login":
            return auth_result(len(calls))
        assert req.method == "PATCH" and req.url.path == "/api/presentations/12"
        assert json.loads(req.content) == {"title": "One"}
        if status is None:
            raise httpx.ReadTimeout("secret body must not be echoed")
        return httpx.Response(status, json={"message": "secret body must not be echoed"})

    with client_for(handler, writes=True) as client:
        result = invoke(client, "update_deck", id=12, body={"title": "One"})
        assert result["isError"] is True
        assert "secret body" not in str(result)
    assert len(calls) == 2


def test_invalid_calls_and_unauthenticated_large_request_do_not_reach_upstream(monkeypatch):
    def unexpected(req):
        pytest.fail(f"Unexpected {req.method} request")

    with client_for(unexpected, writes=True) as client:
        assert invoke(client, "get_deck", id="../other")["isError"]
        assert invoke(client, "list_decks", limit=300)["isError"]
        assert invoke(client, "list_decks", headers={"Authorization": "override"})["isError"]
        assert invoke(client, "update_deck", id=12, body={"admin": True})["isError"]
        assert invoke(client, "upload_media", body={"_payload": {}, "file": {"url": "https://ignored.test"}})["isError"]
        monkeypatch.setattr("server.MAX_REQUEST_BYTES", 5)
        assert rpc(client, "tools/list").status_code == 413
        assert rpc(client, "tools/list", headers={"Accept": ACCEPT}).status_code == 401


def test_binary_upload_is_translated_to_payload_multipart():
    def handler(req):
        if req.url.path == "/api/users/login":
            return auth_result(1)
        assert req.url.path == "/api/media"
        assert req.headers["content-type"].startswith("multipart/form-data;")
        assert b'name="_payload"\r\n\r\n{"alt":"Sample"}' in req.content
        assert b'name="file"; filename="sample.txt"' in req.content
        assert b'\x00abc' in req.content
        return httpx.Response(201, json={"doc": {"id": 3, "url": "/api/media/file/sample.txt"}})

    with client_for(handler, writes=True) as client:
        result = invoke(client, "upload_media", body={"_payload": {"alt": "Sample"}, "file": {
            "filename": "sample.txt", "base64": base64.b64encode(b"\x00abc").decode(),
        }})
        assert result["structuredContent"] == {"doc": {"id": 3, "url": "https://slides.test/api/media/file/sample.txt"}}
