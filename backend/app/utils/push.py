import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def send_fcm_notification(token: str, title: str, body: str, data: dict | None = None) -> bool:
    """Send push via FCM legacy HTTP API. Returns True on success."""
    if not settings.fcm_server_key:
        logger.info("FCM not configured — push skipped: %s / %s", title, body)
        return False

    payload = {
        "to": token,
        "notification": {"title": title, "body": body},
        "data": data or {},
    }
    try:
        res = httpx.post(
            "https://fcm.googleapis.com/fcm/send",
            headers={
                "Authorization": f"key={settings.fcm_server_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=10,
        )
        if res.status_code == 200:
            return True
        logger.warning("FCM send failed: %s %s", res.status_code, res.text)
    except Exception as e:
        logger.warning("FCM send error: %s", e)
    return False


def send_push_to_user(db, user_id: str, title: str, body: str, data: dict | None = None) -> int:
    from app.models import DeviceToken

    tokens = db.query(DeviceToken).filter(DeviceToken.user_id == user_id).all()
    sent = 0
    for dt in tokens:
        if send_fcm_notification(dt.token, title, body, data):
            sent += 1
    return sent
