"""FastMCP stateless HTTP server for one personal Slides account."""

import asyncio
import hashlib
import hmac
import json
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path

from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from fastmcp.tools.base import Tool, ToolResult
from mcp.types import ToolAnnotations
from pydantic import PrivateAttr

from contract import Operation, compile_contract
from slides_api import MAX_REQUEST_BYTES, SlidesAPI


class SlidesTool(Tool):
    _operation: Operation = PrivateAttr()
    _api: SlidesAPI = PrivateAttr()

    def __init__(self, operation, api):
        super().__init__(
            name=operation.name,
            description=operation.description,
            parameters=operation.validator.schema,
            annotations=ToolAnnotations(
                readOnlyHint=not operation.write,
                destructiveHint=operation.write,
                idempotentHint=operation.method == "GET" and not operation.write,
                openWorldHint=True,
            ),
        )
        self._operation = operation
        self._api = api

    async def run(self, arguments):
        try:
            result = await self._api.call(self._operation, arguments)
        except RecursionError:
            raise ToolError("Slides data exceeded the adapter nesting limit") from None
        return ToolResult(structured_content=result)


class Ingress:
    """Authenticate before reading JSON and bound the whole MCP request."""

    def __init__(self, app, token):
        if not re.fullmatch(r"[a-zA-Z0-9._~+/=-]{32,512}", token):
            raise ValueError("Use a separate MCP bearer token of at least 32 characters")
        self.app = app
        self.token_digest = hashlib.sha256(token.encode()).digest()
        self.inflight = 0

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        if scope["path"] != "/mcp":
            await self.respond(send, 404)
            return
        auth = [value for key, value in scope["headers"] if key == b"authorization"]
        if (len(auth) != 1 or auth[0][:7].lower() != b"bearer " or
                not hmac.compare_digest(hashlib.sha256(auth[0][7:]).digest(), self.token_digest)):
            await self.respond(send, 401, [(b"www-authenticate", b"Bearer realm=\"slides-mcp\"")])
            return
        if scope["method"] != "POST":
            await self.respond(send, 405, [(b"allow", b"POST")])
            return
        if self.inflight >= 8:
            await self.respond(send, 429, [(b"retry-after", b"1")])
            return
        sizes = [value for key, value in scope["headers"] if key == b"content-length"]
        if len(sizes) > 1 or (sizes and (not sizes[0].isdigit() or len(sizes[0]) > 10 or
                                        int(sizes[0]) > MAX_REQUEST_BYTES)):
            await self.respond(send, 413)
            return
        self.inflight += 1
        try:
            content = bytearray()
            try:
                async with asyncio.timeout(10):
                    while True:
                        event = await receive()
                        if event["type"] != "http.request":
                            return
                        if len(content) + len(event["body"]) > MAX_REQUEST_BYTES:
                            await self.respond(send, 413)
                            return
                        content.extend(event["body"])
                        if not event.get("more_body"):
                            break
            except TimeoutError:
                await self.respond(send, 408)
                return

            async def replay():
                nonlocal content
                if content is None:
                    return await receive()
                event = {"type": "http.request", "body": bytes(content), "more_body": False}
                content = None
                return event

            await self.app(scope, replay, send)
        finally:
            self.inflight -= 1

    @staticmethod
    async def respond(send, status, headers=()):
        await send({"type": "http.response.start", "status": status, "headers": list(headers)})
        await send({"type": "http.response.body", "body": b""})


def create_app(spec, api, *, ingress_token, enable_writes=False, allowed_host=None):
    @asynccontextmanager
    async def lifespan(_server):
        try:
            yield None
        finally:
            await api.close()

    if allowed_host and not re.fullmatch(r"[a-zA-Z0-9.-]+(?::[0-9]{1,5})?", allowed_host):
        raise ValueError("SLIDES_MCP_ALLOWED_HOST must be a hostname, optionally with port")
    tools = [SlidesTool(operation, api) for operation in compile_contract(spec) if enable_writes or not operation.write]
    server = FastMCP("Slides", tools=tools, lifespan=lifespan, mask_error_details=True,
                     dereference_schemas=False, tasks=False)
    app = server.http_app(path="/mcp", stateless_http=True, json_response=True, host_origin_protection=True,
                          allowed_hosts=[allowed_host] if allowed_host else None, allowed_origins=[])
    return Ingress(app, ingress_token)


def secret_file(name):
    with open(os.environ[name], "rb") as file:
        value = file.read(4097).rstrip(b"\r\n")
    if not 0 < len(value) <= 4096:
        raise ValueError(f"Invalid secret file for {name}")
    return value.decode("utf-8")


def app_factory():
    spec = json.loads(Path(__file__).with_name("openapi.json").read_text())
    writes = os.getenv("SLIDES_ENABLE_WRITES", "0")
    if writes not in {"0", "1"}:
        raise ValueError("SLIDES_ENABLE_WRITES must be 0 or 1")
    api = SlidesAPI(os.environ["SLIDES_API_URL"], os.environ["SLIDES_EMAIL"], secret_file("SLIDES_PASSWORD_FILE"))
    return create_app(spec, api, ingress_token=secret_file("SLIDES_MCP_TOKEN_FILE"),
                      enable_writes=writes == "1", allowed_host=os.getenv("SLIDES_MCP_ALLOWED_HOST"))
