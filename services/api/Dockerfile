FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

RUN pip install --no-cache-dir fastapi "uvicorn[standard]" pydantic

COPY app ./app

ENV DATABASE_PATH=/data/stockguard.db \
    SEED_DIR=/seed

VOLUME ["/data"]

EXPOSE 8800

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8800"]
