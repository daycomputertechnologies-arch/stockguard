import secrets

from fastapi import Header, HTTPException

from .config import get_settings


def require_token(x_demo_token: str | None = Header(default=None, alias="X-Demo-Token")) -> None:
    expected = get_settings().demo_token
    if not x_demo_token or not secrets.compare_digest(x_demo_token, expected):
        raise HTTPException(
            status_code=401,
            detail={"error": "unauthorized", "message": "Missing or invalid X-Demo-Token header."},
        )


def fail(status: int, error: str, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"error": error, "message": message})
