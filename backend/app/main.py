from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.routers import (
    admin,
    ai_moderation,
    analytics,
    auth,
    communities,
    connections,
    events,
    media,
    messages,
    moderation,
    notifications,
    platform,
    posts,
    privacy,
    profiles,
    push,
    social,
    subscriptions,
    support,
    trust,
    websocket,
)
from app.database import init_database
from app.seed import seed_database

app = FastAPI(title=settings.app_name, version="1.1.0")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api = settings.api_prefix
app.include_router(auth.router, prefix=api)
app.include_router(profiles.router, prefix=api)
app.include_router(posts.router, prefix=api)
app.include_router(communities.router, prefix=api)
app.include_router(events.router, prefix=api)
app.include_router(messages.router, prefix=api)
app.include_router(notifications.router, prefix=api)
app.include_router(platform.router, prefix=api)
app.include_router(admin.router, prefix=api)
app.include_router(trust.router, prefix=api)
app.include_router(moderation.router, prefix=api)
app.include_router(subscriptions.router, prefix=api)
app.include_router(social.router, prefix=api)
app.include_router(analytics.router, prefix=api)
app.include_router(support.router, prefix=api)
app.include_router(privacy.router, prefix=api)
app.include_router(connections.router, prefix=api)
app.include_router(ai_moderation.router, prefix=api)
app.include_router(media.router, prefix=api)
app.include_router(push.router, prefix=api)
app.include_router(websocket.router, prefix=api)

upload_dir = Path(settings.local_upload_dir)
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")


@app.on_event("startup")
def on_startup():
    init_database()
    seed_database()


@app.get("/")
def root():
    return {
        "name": "ThriveHub API",
        "version": "1.1.0",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
        "web_app": "https://thrivehub-web.onrender.com",
    }


@app.get("/health")
def health():
    from app.utils.cache import _get_redis

    return {
        "status": "ok",
        "app": settings.app_name,
        "version": "1.1.0",
        "cache": "redis" if _get_redis() else "memory",
        "storage": "s3" if settings.s3_access_key else "local",
    }
