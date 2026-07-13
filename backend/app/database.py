from sqlalchemy import MetaData, create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


def _normalize_database_url(url: str) -> str:
    """Render provides postgres:// URLs; SQLAlchemy 2.x expects postgresql://."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url


def _use_schema() -> bool:
    return not settings.database_url.startswith("sqlite")


def _schema_name() -> str | None:
    return settings.database_schema if _use_schema() else None


metadata = MetaData(schema=_schema_name())


class Base(DeclarativeBase):
    metadata = metadata


database_url = _normalize_database_url(settings.database_url)
connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@event.listens_for(engine, "connect")
def _set_search_path(dbapi_connection, _connection_record):
    schema = _schema_name()
    if schema and engine.dialect.name == "postgresql":
        cursor = dbapi_connection.cursor()
        cursor.execute(f'SET search_path TO "{schema}", public')
        cursor.close()


def init_database() -> None:
    """Create PostgreSQL schema (if needed) and all application tables."""
    import app.models  # noqa: F401 — register all ORM models with metadata

    schema = _schema_name()
    if schema and engine.dialect.name == "postgresql":
        with engine.begin() as conn:
            conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema}"'))
    Base.metadata.create_all(bind=engine)
    _migrate_sqlite_columns()
    _migrate_postgres_columns()


def _migrate_sqlite_columns() -> None:
    """Add new columns to existing SQLite tables (dev convenience)."""
    if not database_url.startswith("sqlite"):
        return
    migrations = {
        "reports": [
            ("priority", "VARCHAR(16) DEFAULT 'normal'"),
            ("resolved_by", "VARCHAR(36)"),
            ("resolution_notes", "TEXT"),
            ("resolved_at", "DATETIME"),
        ],
        "posts": [
            ("comments_enabled", "BOOLEAN DEFAULT 1"),
        ],
        "social_connections": [
            ("access_token", "TEXT"),
            ("refresh_token", "TEXT"),
            ("token_expires_at", "DATETIME"),
        ],
    }
    with engine.begin() as conn:
        for table, columns in migrations.items():
            existing = {row[1] for row in conn.execute(text(f"PRAGMA table_info({table})")).fetchall()}
            for col_name, col_def in columns:
                if col_name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_def}"))


def _migrate_postgres_columns() -> None:
    """Add new columns to existing PostgreSQL tables."""
    if engine.dialect.name != "postgresql":
        return
    migrations = [
        ('ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_enabled BOOLEAN DEFAULT TRUE'),
        ('ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS access_token TEXT'),
        ('ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS refresh_token TEXT'),
        ('ALTER TABLE social_connections ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ'),
    ]
    with engine.begin() as conn:
        for stmt in migrations:
            conn.execute(text(stmt))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
