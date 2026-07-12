from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ThriveHub API"
    api_prefix: str = "/api/v1"
    secret_key: str = "thrivehub-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    database_url: str = "sqlite:///./thrivehub.db"
    # PostgreSQL schema namespace (ignored for SQLite). Enables pg_dump --schema=thrivehub.
    database_schema: str = "thrivehub"
    default_tenant_code: str = "thrivehub"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    default_page_size: int = 20
    max_page_size: int = 100
    # Redis (optional — falls back to in-memory cache)
    redis_url: str | None = None
    cache_ttl_seconds: int = 300
    # S3-compatible storage (optional — falls back to local uploads/)
    s3_endpoint: str | None = None
    s3_bucket: str = "thrivehub-media"
    s3_access_key: str | None = None
    s3_secret_key: str | None = None
    s3_region: str = "us-east-1"
    local_upload_dir: str = "uploads"
    # FCM push notifications (optional)
    fcm_server_key: str | None = None
    fcm_project_id: str | None = None

    class Config:
        env_file = ".env"


settings = Settings()
