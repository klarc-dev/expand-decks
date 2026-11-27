"""Bounded HTTP transport to one Slides origin with an in-memory Payload login."""

import asyncio
import base64
import binascii
import json
import re
import time
from dataclasses import dataclass
from http.cookiejar import CookieJar, DefaultCookiePolicy
from typing import Any
from urllib.parse import urlsplit

import httpx
from fastmcp.exceptions import ToolError

from contract import NATIVE_ENVELOPE, SEGMENT, Operation

MAX_UPLOAD_BYTES = 8 * 1024 * 1024
MAX_REQUEST_BYTES = 12 * 1024 * 1024
MAX_RESPONSE_BYTES = 4 * 1024 * 1024
MAX_AUTH_BYTES = 128 * 1024
MAX_UPLOAD_ENCODED = 4 * ((MAX_UPLOAD_BYTES + 2) // 3)
AUTH_COOLDOWN_SECONDS = 15
REFRESH_WINDOW_SECONDS = 60
REQUEST_DEADLINE_SECONDS = 30
FILENAME = re.compile(r"[^/\\\\\x00-\x1f\x7f]{1,255}\Z")
CONTENT_TYPE = re.compile(r"[a-zA-Z0-9!#$&^_.+-]+/[a-zA-Z0-9!#$&^_.+-]+\Z")
JWT = re.compile(r"[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\Z")
LINK_FIELDS = {"href", "url", "confirmationUrl", "thumbnailURL"}


def validate_origin(value: str) -> str:
    try:
        url = urlsplit(value)
        if (url.scheme != "https" or not url.hostname or url.username is not None or
                url.password is not None or url.path not in {"", "/"} or url.query or url.fragment or
                not re.fullmatch(r"[A-Za-z0-9.\-:\[\]]+", url.netloc)):
            raise ValueError
        return str(httpx.URL(value)).rstrip("/")
    except ValueError:
        raise ValueError("SLIDES_API_URL must be a fixed HTTPS origin with no credentials or path") from None


class NoCookies(DefaultCookiePolicy):
    def set_ok(self, cookie, request):
        return False


@dataclass(frozen=True)
class Session:
    token: str
    expires: int


class SlidesAPI:
    def __init__(self, origin: str, email: str, password: str, *, transport=None):
        self.origin = validate_origin(origin)
        self.email = email
        self.password = password
        self.client = httpx.AsyncClient(
            transport=transport, follow_redirects=False, trust_env=False,
            timeout=httpx.Timeout(20, connect=5),
            limits=httpx.Limits(max_connections=8, max_keepalive_connections=4),
            cookies=CookieJar(policy=NoCookies()),
            headers={"Accept": "application/json", "Accept-Encoding": "identity"},
        )
        self.session = None
        self.auth_lock = asyncio.Lock()
        self.slots = asyncio.Semaphore(8)
        self.next_login = 0.0

    async def close(self):
        self.session = None
        await self.client.aclose()

    async def request(self, method, path, *, token=None, headers=None, max_bytes=MAX_RESPONSE_BYTES, **kwargs):
        headers = dict(headers or {})
        if token:
            headers["Authorization"] = f"JWT {token}"
        async with self.client.stream(method, self.origin + path, headers=headers, **kwargs) as response:
            status = response.status_code
            if status == 204 or not 200 <= status < 300:
                return status, None
            if (response.headers.get("Content-Encoding", "identity").lower() != "identity" or
                    response.headers.get("Content-Type", "").partition(";")[0].strip().lower() != "application/json"):
                raise ToolError("Slides returned an unexpected response format")
            body = bytearray()
            async for chunk in response.aiter_bytes():
                if len(body) + len(chunk) > max_bytes:
                    raise ToolError("Slides response exceeded the adapter limit")
                body.extend(chunk)
            try:
                return status, json.loads(body, parse_constant=_invalid_json_constant)
            except (ValueError, RecursionError):
                raise ToolError("Slides returned invalid JSON") from None

    async def get_token(self, rejected: str | None = None) -> str:
        async with self.auth_lock:
            now = time.time()
            if self.session and self.session.token == rejected:
                self.session = None
            if self.session and self.session.expires > now + REFRESH_WINDOW_SECONDS:
                return self.session.token
            if self.session and self.session.expires > now:
                status, body = await self.request("POST", "/api/users/refresh-token", token=self.session.token,
                                                  max_bytes=MAX_AUTH_BYTES)
                if status not in {401, 403}:
                    self.session = _read_session(status, body, "refreshedToken")
                    return self.session.token
                self.session = None
            if time.monotonic() < self.next_login:
                raise ToolError("Slides sign-in unavailable. Try again in a moment")
            self.next_login = time.monotonic() + AUTH_COOLDOWN_SECONDS
            status, body = await self.request("POST", "/api/users/login", max_bytes=MAX_AUTH_BYTES,
                                              json={"email": self.email, "password": self.password})
            self.session = _read_session(status, body, "token")
            self.next_login = 0.0
            return self.session.token

    async def call(self, operation: Operation, arguments: dict[str, Any]) -> dict[str, Any]:
        if not operation.validator.is_valid(arguments):
            raise ToolError("Invalid tool arguments. Check the tool input schema")
        path, query = operation.path, {}
        for parameter in operation.parameters:
            value = arguments.get(parameter.arg, parameter.default)
            if parameter.location == "path":
                segment = str(value)
                if not SEGMENT.fullmatch(segment):
                    raise ToolError("Invalid Slides path parameter")
                path = path.replace("{" + parameter.wire + "}", segment)
            elif value is not None:
                query[parameter.wire] = value
        if operation.native:
            query.update({"depth": 0, **{f"select[{field}]": True for field in operation.select}})
        options = {"params": query}
        if "body" in arguments:
            if operation.media_type == "multipart/form-data":
                options["files"] = multipart(arguments["body"])
            else:
                options["content"] = bounded_json(arguments["body"])
                options["headers"] = {"Content-Type": "application/json"}
        try:
            async with asyncio.timeout(REQUEST_DEADLINE_SECONDS), self.slots:
                token = await self.get_token()
                status, body = await self.request(operation.method, path, token=token, **options)
                if status == 401:
                    if operation.method == "GET" and not operation.write:
                        token = await self.get_token(rejected=token)
                        status, body = await self.request(operation.method, path, token=token, **options)
                    else:
                        async with self.auth_lock:
                            if self.session and self.session.token == token:
                                self.session = None
                if not 200 <= status < 300:
                    message = f"Slides rejected the request (HTTP {status})"
                    if operation.write:
                        message += ". The adapter did not retry the operation"
                    raise ToolError(message)
                return project(operation, body, self.origin)
        except (httpx.RequestError, TimeoutError):
            message = "Slides request failed or timed out"
            if operation.write:
                message += ". Check the current Slides state before trying again"
            raise ToolError(message) from None


def _invalid_json_constant(value):
    raise ValueError("Non-finite JSON value")


def _read_session(status, body, key):
    if status != 200 or not isinstance(body, dict):
        raise ToolError("Slides sign-in or refresh failed. Check the configured Slides user")
    token, expires = body.get(key), body.get("exp")
    if (not isinstance(token, str) or len(token) > 16_384 or not JWT.fullmatch(token) or
            type(expires) is not int or expires <= time.time()):
        raise ToolError("Slides returned an invalid login session")
    return Session(token, expires)


def bounded_json(value):
    try:
        payload = json.dumps(value, ensure_ascii=True, allow_nan=False, separators=(",", ":")).encode()
    except (ValueError, RecursionError, TypeError):
        raise ToolError("Invalid JSON request body") from None
    if len(payload) > MAX_REQUEST_BYTES:
        raise ToolError("Slides request body exceeded the adapter limit")
    return payload


def multipart(body):
    if not isinstance(body, dict) or set(body) != {"_payload", "file"} or not isinstance(body["_payload"], dict):
        raise ToolError("Invalid Slides upload body")
    file = body["file"]
    if not isinstance(file, dict) or set(file) - {"filename", "base64", "contentType"}:
        raise ToolError("Invalid Slides upload file")
    filename = file.get("filename")
    data = file.get("base64")
    content_type = file.get("contentType", "application/octet-stream")
    if (not isinstance(filename, str) or not FILENAME.fullmatch(filename) or filename.strip() in {"", ".", ".."} or
            not isinstance(content_type, str) or not CONTENT_TYPE.fullmatch(content_type) or len(content_type) > 128 or
            not isinstance(data, str) or not data or len(data) > MAX_UPLOAD_ENCODED):
        raise ToolError("Invalid Slides upload filename, content type or size")
    try:
        contents = base64.b64decode(data, validate=True)
    except (ValueError, binascii.Error):
        raise ToolError("Upload data must be valid base64") from None
    if not 0 < len(contents) <= MAX_UPLOAD_BYTES:
        raise ToolError("Slides upload exceeds 8 MiB")
    fields = bounded_json(body["_payload"])
    if len(fields) + len(contents) > MAX_REQUEST_BYTES:
        raise ToolError("Combined Slides upload and metadata exceeded the adapter limit")
    return {"_payload": (None, fields), "file": (filename, contents, content_type)}


def project(operation, body, origin):
    if body is None:
        return {}
    if not isinstance(body, dict):
        raise ToolError("Slides returned an unexpected response shape")

    def select(record):
        if not isinstance(record, dict):
            raise ToolError("Slides returned an unexpected document shape")
        return {field: record[field] for field in operation.select if field in record}

    if operation.native and "docs" in body:
        docs = body["docs"]
        if not isinstance(docs, list) or len(docs) > 50:
            raise ToolError("Slides returned an unexpected amount of documents")
        result = {"docs": [select(record) for record in docs]}
        result.update({key: body[key] for key in NATIVE_ENVELOPE if key in body and type(body[key]) in {int, bool, type(None)}})
    elif operation.native and "doc" in body:
        result = {"doc": select(body["doc"])}
    else:
        result = select(body)
    return normalize_links(result, origin)


def normalize_links(value, origin):
    if isinstance(value, dict):
        return {key: normalize_link(child, origin, same_origin=(key == "confirmationUrl"))
                if key in LINK_FIELDS and isinstance(child, str) else normalize_links(child, origin)
                for key, child in value.items()}
    if isinstance(value, list):
        return [normalize_links(child, origin) for child in value]
    return value


def normalize_link(value, origin, *, same_origin=False):
    if any(ord(char) < 0x20 for char in value) or "\\" in value:
        return None
    if value.startswith("/") and not value.startswith("//"):
        return origin + value
    try:
        url = urlsplit(value)
        if (url.scheme == "https" and url.hostname and url.username is None and url.password is None and
                (not same_origin or validate_origin(f"https://{url.netloc}") == origin)):
            return value
    except ValueError:
        pass
    return None
