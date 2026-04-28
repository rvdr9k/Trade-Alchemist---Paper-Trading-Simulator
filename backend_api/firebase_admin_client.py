import os
from pathlib import Path

import firebase_admin
from firebase_admin import credentials


def get_firebase_admin_app():
    try:
        return firebase_admin.get_app()
    except ValueError:
        pass

    service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
    if not service_account_path:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT_PATH not found in environment")

    candidate_path = Path(service_account_path).expanduser()
    if not candidate_path.is_absolute():
        # Always resolve relative to backend_api/ (this file's directory), not CWD
        candidate_path = Path(__file__).resolve().parent / candidate_path

    if not candidate_path.exists():
        raise FileNotFoundError(
            f"Firebase service account file not found at: {candidate_path}"
        )

    credential = credentials.Certificate(str(candidate_path))
    return firebase_admin.initialize_app(credential)

