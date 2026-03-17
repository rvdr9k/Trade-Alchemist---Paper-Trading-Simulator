import os

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

    credential = credentials.Certificate(service_account_path)
    return firebase_admin.initialize_app(credential)
