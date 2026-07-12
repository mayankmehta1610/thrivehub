from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, auth, communities, events, messages, notifications, platform, posts, profiles
from app.seed import seed_database

app = FastAPI(title=settings.app_name, version="1.0.0")

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


@app.on_event("startup")
def on_startup():
    seed_database()


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
