"""
app/models/email_ingest_queue.py
Fila de staging para governança de planilhas recebidas por e-mail.
"""
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class EmailIngestQueue(Base):
    __tablename__ = "email_ingest_queue"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id: Mapped[str] = mapped_column(String(500), unique=True, index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(500), nullable=False)
    sender: Mapped[str] = mapped_column(String(200), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    file_name: Mapped[str | None] = mapped_column(String(500), nullable=True)
    period_start: Mapped[str | None] = mapped_column(String(20), nullable=True)
    period_end: Mapped[str | None] = mapped_column(String(20), nullable=True)
    period_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    kpi_types: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    diff_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    payload_raw: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)  # PENDING | ACCEPTED | REJECTED | SUPERSEDED
    has_manual_conflict: Mapped[bool] = mapped_column(Boolean, default=False)
    is_update: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewed_by: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewer_email: Mapped[str | None] = mapped_column(String, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reject_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
