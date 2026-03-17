from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from firebase_admin import auth

from firebase_admin_client import get_firebase_admin_app


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
):
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        get_firebase_admin_app()
        decoded_token = auth.verify_id_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid Firebase token") from exc

    return {
        "uid": decoded_token["uid"],
        "email": decoded_token.get("email"),
        "name": decoded_token.get("name"),
        "picture": decoded_token.get("picture"),
    }
