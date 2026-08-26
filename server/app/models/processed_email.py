"""
app/models/processed_email.py
Histórico de e-mails/relatórios já processados — evita reprocessar o
mesmo relatório duas vezes (Épico 2: "Identificar e-mails já
processados" / "Evitar processamento duplicado").

Quem grava aqui é o ingestion_service, a partir do que o bot de
extração (Épico 2/3) mandar pra esta API via POST /api/ingestion/kpi-report.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base


class ProcessedEmail(Base):
    __tablename__ = "processed_emails"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    message_id: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String, nullable=False)
    sender: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="PROCESSED")  # PROCESSED | FAILED | SKIPPED
    processed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
