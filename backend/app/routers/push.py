from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import DeviceToken, User
from app.schemas import DeviceTokenCreate

router = APIRouter(prefix="/push", tags=["Push Notifications"])


@router.post("/register", status_code=201)
def register_device(payload: DeviceTokenCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = (
        db.query(DeviceToken)
        .filter(DeviceToken.user_id == user.id, DeviceToken.platform == payload.platform, DeviceToken.token == payload.token)
        .first()
    )
    if existing:
        return {"status": "already_registered", "id": existing.id}
    dt = DeviceToken(user_id=user.id, platform=payload.platform, token=payload.token)
    db.add(dt)
    db.commit()
    db.refresh(dt)
    return {"status": "registered", "id": dt.id}


@router.delete("/unregister")
def unregister_device(platform: str, token: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    dt = (
        db.query(DeviceToken)
        .filter(DeviceToken.user_id == user.id, DeviceToken.platform == platform, DeviceToken.token == token)
        .first()
    )
    if dt:
        db.delete(dt)
        db.commit()
    return {"status": "unregistered"}


@router.get("/setup")
def push_setup_info():
    """Documentation for push notification setup."""
    return {
        "android": {
            "provider": "FCM",
            "steps": [
                "Create a Firebase project at https://console.firebase.google.com",
                "Add Android app with package name com.thrivehub.mobile",
                "Download google-services.json into mobile/android/app/",
                "Set FCM_SERVER_KEY in backend .env",
                "Call POST /api/v1/push/register with platform=android and FCM token",
            ],
        },
        "ios": {
            "provider": "APNs via FCM",
            "steps": [
                "In Firebase console, add iOS app with bundle ID com.thrivehub.mobile",
                "Upload APNs authentication key (.p8) or certificate to Firebase",
                "Download GoogleService-Info.plist into mobile/ios/Runner/",
                "Enable Push Notifications capability in Xcode",
                "Request notification permission in Flutter (firebase_messaging package)",
                "Register device token via POST /api/v1/push/register with platform=ios",
            ],
            "note": "iOS push requires Apple Developer account and physical device for testing",
        },
        "env_vars": {
            "FCM_SERVER_KEY": "Firebase Cloud Messaging server key (legacy)",
            "FCM_PROJECT_ID": "Firebase project ID (for HTTP v1 API upgrade)",
        },
    }
