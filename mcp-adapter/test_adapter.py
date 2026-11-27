import base64
import copy
import json
import time
from pathlib import Path

import httpx
import pytest
from starlette.testclient import TestClient

from contract import compile_contract
from server import create_app
from slides_api import SlidesAPI

SPEC = json.loads(Path(__file__).with_name("openapi.json").read_text())
ORIGIN = "https://slides.test"
SECRET = "personal-token-" + "a" * 32
HEADERS = {"Authorization": f"Bearer {SECRET}", "Accept": "application/json, text/event-stream"}


def client(handler, **kwargs):
    api = SlidesAPI(ORIGIN, "author@example.test", "payload-password", transport=httpx.MockTransport(handler))
    return TestClient(create_app(SPEC, api, ingress_token=SECRET, **kwargs), base_url="https://localhost")


def rpc(client, method, params=None, headers=None):
    message = {"jsonrpc": "2.0", "id": 1, "method": method}
    if params is not None:
        message["params"] = params
    return client.post("/mcp", headers=HEADERS if headers is None else headers, json=message)


def invoke(client, name, **arguments):
    response = rpc(client, "tools/call", {"name": name, "arguments": arguments})
    assert response.status_code == 200, response.text
    return response.json()["result"]


def login(index, ttl=600):
    return httpx.Response(200, json={"token": f"jwt.session{index}.sig", "exp": int(time.time()) + ttl},
                          headers={"set-cookie": "payload-token=do-not-forward; Path=/"})


def unexpected(request):
    pytest.fail(f"Unexpected upstream request: {request.method} {request.url.path}")


def test_http_ingress_and_generated_catalog():
    with client(unexpected, allowed_host="mcp.example.test") as app:
        assert rpc(app, "tools/list", headers={}).status_code == 401
        assert rpc(app, "tools/list", headers={**HEADERS, "Authorization": "Bearer jwt.session1.sig"}).status_code == 401
        assert rpc(app, "tools/list", headers={**HEADERS, "Host": "elsewhere.example.test"}).status_code == 421
        assert rpc(app, "tools/list", headers={**HEADERS, "Origin": "https://elsewhere.example.test"}).status_code == 403
        assert app.get("/mcp", headers=HEADERS).status_code == 405
        initialized = rpc(app, "initialize", {"protocolVersion": "2025-11-25", "capabilities": {},
                                               "clientInfo": {"name": "test", "version": "1"}})
        assert initialized.json()["result"]["serverInfo"]["name"] == "Slides"
        read_names = {tool["name"] for tool in rpc(app, "tools/list").json()["result"]["tools"]}
        assert read_names == {operation.name for operation in compile_contract(SPEC) if not operation.write}
        assert invoke(app, "update_deck", id=1, body={"title": "Blocked"})["isError"]
        assert rpc(app, "tools/list", headers={**HEADERS, "Host": "mcp.example.test"}).status_code == 200
    with client(unexpected, enable_writes=True) as app:
        tools = {tool["name"]: tool for tool in rpc(app, "tools/list").json()["result"]["tools"]}
        operations = {operation.name: operation for operation in compile_contract(SPEC)}
        assert tools.keys() == operations.keys()
        for name, operation in operations.items():
            assert tools[name]["inputSchema"] == operation.validator.schema
            assert tools[name]["annotations"]["readOnlyHint"] is not operation.write
        for item in SPEC["paths"].values():
            for operation in item.values():
                if body := operation.get("requestBody"):
                    media = next(iter(body["content"].values()))
                    name = operation["operationId"]
                    assert tools[name]["inputSchema"]["properties"]["body"] == media["schema"]
        slide = tools["manage_deck_slides"]["inputSchema"]["properties"]["body"]
        assert any("oneOf" in branch["properties"].get("slide", {}) for branch in slide["oneOf"])
        file = tools["upload_media"]["inputSchema"]["properties"]["body"]["properties"]["file"]
        assert file["properties"]["base64"]["type"] == "string"
        assert "base64" in file["required"]


def test_get_reauth_uses_fixed_origin_and_native_projection():
    calls = []

    def handler(req):
        calls.append(req)
        assert str(req.url).startswith(ORIGIN + "/api/")
        assert "cookie" not in req.headers and "x-client-api-key" not in req.headers
        if req.url.path == "/api/users/login":
            assert "authorization" not in req.headers
            assert json.loads(req.content) == {"email": "author@example.test", "password": "payload-password"}
            return login(len(calls))
        assert req.headers["authorization"] == f"JWT jwt.session{1 if len(calls) == 2 else 3}.sig"
        assert req.url.params["limit"] == "20" and req.url.params["depth"] == "0"
        assert req.url.params["where[slug][equals]"] == "my-deck"
        assert req.url.params["select[title]"] == "true"
        if len(calls) == 2:
            return httpx.Response(401)
        return httpx.Response(200, json={"docs": [{"title": "Deck", "internal": "hidden"}], "totalDocs": 1, "other": "hidden"})

    with client(handler) as app:
        response = rpc(app, "tools/call", {"name": "list_decks", "arguments": {"slug": "my-deck"}},
                       headers={**HEADERS, "X-Client-Api-Key": "unused", "Cookie": "unused"})
        assert response.json()["result"]["structuredContent"] == {"docs": [{"title": "Deck"}], "totalDocs": 1}
        assert invoke(app, "list_decks", slug="my-deck")["structuredContent"]["totalDocs"] == 1
    assert len(calls) == 5


def test_expiring_jwt_is_refreshed_before_dispatch():
    calls = []

    def handler(req):
        calls.append(req.url.path)
        if req.url.path == "/api/users/login":
            return login(1, ttl=45)
        if req.url.path == "/api/users/refresh-token":
            assert req.headers["authorization"] == "JWT jwt.session1.sig"
            return httpx.Response(200, json={"refreshedToken": "jwt.refreshed.sig", "exp": int(time.time()) + 600})
        assert req.headers["authorization"] == ("JWT jwt.session1.sig" if len(calls) == 2 else "JWT jwt.refreshed.sig")
        return httpx.Response(200, json={"id": 1, "title": "Test"})

    with client(handler) as app:
        for _ in range(2):
            assert invoke(app, "get_deck", id=1)["structuredContent"]["title"] == "Test"
    assert calls == ["/api/users/login", "/api/presentations/1", "/api/users/refresh-token", "/api/presentations/1"]


@pytest.mark.parametrize("status", [401, 403, 503, None])
def test_mutation_never_replayed_after_dispatch(status):
    calls = []

    def handler(req):
        calls.append(req)
        if req.url.path == "/api/users/login":
            return login(1)
        assert req.method == "PATCH" and req.headers["authorization"] == "JWT jwt.session1.sig"
        assert json.loads(req.content) == {"title": "One"}
        if status is None:
            raise httpx.ReadTimeout("do not echo upstream secrets")
        return httpx.Response(status, json={"message": "do not echo upstream secrets"})

    with client(handler, enable_writes=True) as app:
        result = invoke(app, "update_deck", id=12, body={"title": "One"})
        assert result["isError"] and "upstream secrets" not in str(result)
    assert len(calls) == 2


def test_read_only_post_never_replayed():
    calls = []

    def handler(req):
        calls.append(req.url.path)
        return login(1) if req.url.path == "/api/users/login" else httpx.Response(401)

    with client(handler) as app:
        result = invoke(app, "preview_slide", body={"presentationId": 1, "block": {
            "blockType": "cover", "title": "Slide",
        }})
        assert result["isError"] and "401" in str(result)
    assert calls == ["/api/users/login", "/api/slide-preview"]


def test_nested_validation_unknown_args_and_remote_file_rejection():
    with client(unexpected, enable_writes=True) as app:
        for value in ("..", "1/2", "1%2f2", "https://other.test"):
            assert invoke(app, "get_deck", id=value)["isError"]
        assert invoke(app, "list_decks", limit=51)["isError"]
        assert invoke(app, "list_decks", depth=2)["isError"]
        assert invoke(app, "update_deck", id=1, body={"lastBuildStatus": "new"})["isError"]
        body = {"action": "insert", "deckId": 1, "index": 0, "expectedRevision": "a" * 64,
                "slide": {"blockType": "mermaid", "title": "missing source"}}
        assert invoke(app, "manage_deck_slides", body=body)["isError"]
        assert invoke(app, "upload_media", body={"_payload": {}, "file": {"url": "https://other.test"}})["isError"]
        assert invoke(app, "upload_media", body={"_payload": {}, "file": {"filename": "a.txt", "base64": "%%%="}})["isError"]


def test_valid_nested_mutation_and_multipart_upload():
    body = {"action": "insert", "deckId": 1, "index": 0, "expectedRevision": "a" * 64,
            "slide": {"blockType": "cover", "title": "Valid cover"}}

    def handler(req):
        if req.url.path == "/api/users/login":
            return login(1)
        if req.url.path == "/api/deck-slides":
            assert json.loads(req.content) == body
            assert not req.url.query
            return httpx.Response(200, json={"slideId": "abc123", "internal": "hidden"})
        assert req.url.path == "/api/media"
        content = req.read()
        assert req.headers["content-type"].startswith("multipart/form-data;")
        assert b'name="_payload"\r\n\r\n{"alt":"Sample"}' in content
        assert b'name="file"; filename="sample.txt"' in content and b"\x00abc" in content
        return httpx.Response(201, json={"doc": {"id": 3, "url": "/api/media/file/sample.txt", "secret": True}})

    with client(handler, enable_writes=True) as app:
        assert invoke(app, "manage_deck_slides", body=body)["structuredContent"] == {"slideId": "abc123"}
        result = invoke(app, "upload_media", body={"_payload": {"alt": "Sample"}, "file": {
            "filename": "sample.txt", "base64": base64.b64encode(b"\x00abc").decode(),
        }})
        assert result["structuredContent"] == {"doc": {"id": 3, "url": ORIGIN + "/api/media/file/sample.txt"}}


def test_reply_bounds_redirects_and_ingress_body_limit(monkeypatch):
    calls = []

    def handler(req):
        calls.append(req.url)
        if req.url.path == "/api/users/login":
            return login(1)
        if len(calls) == 2:
            return httpx.Response(307, headers={"location": "https://other.test/private"})
        return httpx.Response(200, json={"docs": ["a" * (4 * 1024 * 1024)]})

    with client(handler) as app:
        redirect = invoke(app, "list_decks")
        assert redirect["isError"] and "307" in str(redirect) and "other.test" not in str(redirect)
        assert "exceeded" in str(invoke(app, "list_decks"))
        monkeypatch.setattr("server.MAX_REQUEST_BYTES", 8)
        assert rpc(app, "tools/list").status_code == 413
        assert rpc(app, "tools/list", headers={}).status_code == 401
        assert app.post("/mcp", headers=HEADERS, content=iter([b"12345", b"67890"])).status_code == 413
    assert len(calls) == 3


def test_openapi_fail_closed():
    for path in ("/api/users/login", "/api/../admin", "//wrong.test", "/api/{id}"):
        spec = copy.deepcopy(SPEC)
        spec["paths"][path] = spec["paths"].pop("/api/google-fonts")
        with pytest.raises(ValueError, match="Invalid API path"):
            compile_contract(spec)
    spec = copy.deepcopy(SPEC)
    spec["paths"]["/api/media"]["post"]["requestBody"]["content"]["multipart/form-data"]["schema"] = {
        "$ref": "https://wrong.test/schema",
    }
    with pytest.raises(ValueError, match="local OpenAPI components"):
        compile_contract(spec)
