from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ThriveHub API"
    api_prefix: str = "/api/v1"
    secret_key: str = "thrivehub-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30
    database_url: str = "sqlite:///./thrivehub.db"
    default_tenant_code: str = "thrivehub"
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    default_page_size: int = 20
    max_page_size: int = 100

    class Config:
        env_file = ".env"


settings = Settings()
