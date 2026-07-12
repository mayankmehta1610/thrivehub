import json

from sqlalchemy.orm import Session

from app.models import AuditLog


def log_audit(
    db: Session,
    *,
    tenant_id: str,
    actor_id: str,
    action: str,
    entity_type: str,
    entity_id: str | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
) -> AuditLog:
    entry = AuditLog(
        tenant_id=tenant_id,
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details_json=json.dumps(details) if details else None,
        ip_address=ip_address,
    )
    db.add(entry)
    db.flush()
    return entry
