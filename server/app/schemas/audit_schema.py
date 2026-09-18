"""
app/schemas/audit_schema.py
DTOs do audit log.
"""
from datetime import datetime
from typing import Any
from pydantic import BaseModel


class AuditLogOut(BaseModel):
    id: str
    actor_user_id: str | None = None
    actor_role_snapshot: str | None = None
    action: str
    target_type: str | None = None
    target_id: str | None = None
    metadata: dict[str, Any] | None = None
    occurred_at: str | None = None
    ip_address: str | None = None

    model_config = {"from_attributes": True}


class AuditLogListOut(BaseModel):
    total: int
    page: int
    page_size: int
    items: list[AuditLogOut]
