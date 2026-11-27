"""Project the generated, allowlisted OpenAPI contract onto MCP tool inputs."""

import re
from dataclasses import dataclass
from typing import Any

from jsonschema import Draft202012Validator

NAME = re.compile(r"[A-Za-z_][A-Za-z0-9_-]{0,79}\Z")
SEGMENT = re.compile(r"[A-Za-z0-9_-]{1,128}\Z")
PLACEHOLDER = re.compile(r"\{([A-Za-z_][A-Za-z0-9_-]*)\}\Z")
WIRE_QUERY = re.compile(r"[A-Za-z_][A-Za-z0-9_-]*(?:\[[A-Za-z0-9_-]+\])*\Z")
METHODS = {"get", "post", "patch", "put", "delete"}
RESERVED_QUERY = {"depth", "select", "populate", "joins", "pagination", "overrideAccess"}
RESERVED_ROOTS = {"users", "accounts", "auth", "graphql", "graphql-playground", "payload-jobs"}
NATIVE_ENVELOPE = {
    "totalDocs", "totalPages", "limit", "page", "pagingCounter", "hasPrevPage",
    "hasNextPage", "prevPage", "nextPage",
}


@dataclass(frozen=True)
class Parameter:
    arg: str
    wire: str
    location: str
    default: Any


@dataclass(frozen=True)
class Operation:
    name: str
    method: str
    path: str
    description: str
    write: bool
    native: bool
    select: tuple[str, ...]
    media_type: str | None
    parameters: tuple[Parameter, ...]
    validator: Draft202012Validator


def compile_contract(spec: dict[str, Any]) -> list[Operation]:
    if not re.fullmatch(r"3\.1\.\d+", spec.get("openapi", "")):
        raise ValueError("Expected OpenAPI 3.1")
    definitions = spec.get("components", {}).get("schemas", {})

    def remap_refs(value):
        if isinstance(value, dict):
            result = {key: remap_refs(child) for key, child in value.items()}
            if "$ref" in result:
                ref = result["$ref"]
                prefix = "#/components/schemas/"
                if not isinstance(ref, str) or not ref.startswith(prefix) or ref[len(prefix):] not in definitions:
                    raise ValueError("Only references to local OpenAPI components are supported")
                result["$ref"] = "#/$defs/" + ref[len(prefix):]
            if {"$id", "$schema", "$dynamicRef", "$anchor", "$dynamicAnchor"} & result.keys():
                raise ValueError("External or dynamic schema resolution is not supported")
            return result
        if isinstance(value, list):
            return [remap_refs(child) for child in value]
        return value

    defs = {key: remap_refs(schema) for key, schema in definitions.items()}
    operations = []
    names = set()
    for path, path_item in spec["paths"].items():
        segments = path.split("/")
        if (segments[:2] != ["", "api"] or len(segments) < 3 or not SEGMENT.fullmatch(segments[2]) or
                segments[2].lower() in RESERVED_ROOTS or
                any(not SEGMENT.fullmatch(part) and not PLACEHOLDER.fullmatch(part) for part in segments[3:])):
            raise ValueError(f"Invalid API path: {path}")
        placeholders = {match[1] for part in segments[2:] if (match := PLACEHOLDER.fullmatch(part))}
        if "$ref" in path_item:
            raise ValueError("Referenced path items are not supported")
        for method, raw in path_item.items():
            if method not in METHODS:
                if method not in {"parameters", "summary", "description", "servers"}:
                    raise ValueError(f"Unsupported API method: {method}")
                continue
            name = raw["operationId"]
            write = raw["x-slides-write"]
            native = raw.get("x-slides-native", False)
            select = raw["x-slides-select"]
            if (not NAME.fullmatch(name) or name in names or type(write) is not bool or
                    type(native) is not bool or (method in {"patch", "put", "delete"} and not write) or
                    (method == "get" and write) or (native and method == "post" and not write) or
                    not isinstance(select, list) or not select or len(select) != len(set(select)) or
                    not all(NAME.fullmatch(key) for key in select)):
                raise ValueError(f"Invalid operation metadata: {name}")
            names.add(name)
            params, properties, required, bound_paths, wire_keys = [], {}, [], set(), set()
            for param in path_item.get("parameters", []) + raw.get("parameters", []):
                wire, location = param["name"], param["in"]
                arg = param.get("x-slides-arg", wire)
                if not WIRE_QUERY.fullmatch(arg) or arg == "body" or arg in properties or (location, wire) in wire_keys:
                    raise ValueError(f"Invalid/duplicate tool argument: {arg}")
                wire_keys.add((location, wire))
                if location == "path" and wire in placeholders and param.get("required") is True:
                    bound_paths.add(wire)
                elif (location != "query" or not WIRE_QUERY.fullmatch(wire) or
                        wire.split("[", 1)[0] in RESERVED_QUERY):
                    raise ValueError(f"Unsupported tool parameter: {wire}")
                schema = remap_refs(param["schema"])
                if schema.get("type") not in {"string", "integer", "boolean", "number"}:
                    raise ValueError(f"Only scalar path/query parameters are supported: {wire}")
                default = schema.get("default")
                if wire == "limit":
                    if schema["type"] != "integer":
                        raise ValueError("limit must be an integer")
                    schema["minimum"] = max(schema.get("minimum", 1), 1)
                    schema["maximum"] = min(schema.get("maximum", 50), 50)
                    default = schema.setdefault("default", 20)
                if default is not None and not Draft202012Validator(schema).is_valid(default):
                    raise ValueError(f"Invalid parameter default: {wire}")
                params.append(Parameter(arg, wire, location, default))
                properties[arg] = schema
                if param.get("required") is True:
                    required.append(arg)
            if bound_paths != placeholders:
                raise ValueError(f"Unbound API path parameters: {path}")
            media_type = None
            if request_body := raw.get("requestBody"):
                content = request_body["content"]
                if len(content) != 1:
                    raise ValueError(f"Expected exactly one request content type: {name}")
                media_type, media = next(iter(content.items()))
                if method == "get" or media_type not in {"application/json", "multipart/form-data"}:
                    raise ValueError(f"Unsupported request content type: {name}")
                properties["body"] = remap_refs(media["schema"])
                if request_body.get("required") or media_type == "multipart/form-data":
                    required.append("body")
            schema = {"type": "object", "properties": properties, "required": required, "additionalProperties": False}
            if defs:
                schema["$defs"] = defs
            Draft202012Validator.check_schema(schema)
            operations.append(Operation(name, method.upper(), path, raw.get("description") or raw.get("summary") or name,
                                        write, native, tuple(select), media_type, tuple(params), Draft202012Validator(schema)))
    if not operations:
        raise ValueError("No tool operations found")
    return operations
