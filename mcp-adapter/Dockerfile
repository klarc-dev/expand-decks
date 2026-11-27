FROM ghcr.io/astral-sh/uv:0.13.10@sha256:a3ea1357342c1a4bf9a0c53a3deb1b55379aefa037338d8113d5771efa01774f AS uv
FROM python:3.12.14-slim@sha256:f77ac9e44ae96ef2c90b8053ea08c31f8be030f824196b0ae4db6d462c84e51f AS base
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 UV_PYTHON_DOWNLOADS=never UV_LINK_MODE=copy
WORKDIR /app

FROM base AS dependencies
COPY --from=uv /uv /bin/uv
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

FROM dependencies AS test
RUN uv sync --locked --no-install-project
COPY contract.py server.py slides_api.py openapi.json test_adapter.py ./
RUN .venv/bin/pytest -q

FROM base AS runtime
ENV PATH="/app/.venv/bin:${PATH}"
COPY --from=dependencies /app/.venv /app/.venv
COPY contract.py server.py slides_api.py openapi.json ./
USER 10001:10001
EXPOSE 8000
CMD ["uvicorn", "server:app_factory", "--factory", "--host", "0.0.0.0", "--port", "8000", "--no-proxy-headers", "--no-access-log"]
