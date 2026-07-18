FROM python:3.12-slim AS runtime

ARG UV_VERSION=0.11.29
ARG INSTALL_MODEL_DEPS=false

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH"

RUN python -m pip install --no-cache-dir "uv==${UV_VERSION}"

WORKDIR /app
COPY apps/api/pyproject.toml apps/api/uv.lock ./
RUN if [ "$INSTALL_MODEL_DEPS" = "true" ]; then \
      uv sync --frozen --no-dev --extra model; \
    else \
      uv sync --frozen --no-dev; \
    fi

COPY apps/api/app ./app
COPY data ./data

RUN addgroup --system bunrishot \
    && adduser --system --ingroup bunrishot bunrishot \
    && mkdir -p /app/runtime /app/models \
    && chown -R bunrishot:bunrishot /app/runtime /app/models

USER bunrishot

ENV APP_ENV=production \
    GUIDES_PATH=/app/data/disposal-guides.ko.json \
    DATABASE_URL=sqlite:////app/runtime/app.db \
    MODEL_PATH=/app/models/garbage_classifier.pt \
    MODEL_METADATA_PATH=/app/models/metadata.json

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=2)"

CMD ["fastapi", "run", "app/main.py", "--host", "0.0.0.0", "--port", "8000"]
