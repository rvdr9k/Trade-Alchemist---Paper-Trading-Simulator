from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth
import os

from firebase_admin_client import get_firebase_admin_app


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        app = get_firebase_admin_app()
        decoded_token = auth.verify_id_token(credentials.credentials, app=app)
    except Exception as exc:
        detail = "Invalid Firebase token"
        if os.getenv("ENV", "development").lower() != "production":
            detail = f"Invalid Firebase token: {exc}"
        raise HTTPException(status_code=401, detail=detail) from exc

    return {
        "uid": decoded_token["uid"],
        "email": decoded_token.get("email"),
        "name": decoded_token.get("name"),
        "picture": decoded_token.get("picture"),
    }
