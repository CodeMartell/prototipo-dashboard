"""
app/repositories/processed_email_repository.py
Controle de duplicidade de e-mail — usado pelo ingestion_service pra
checar se um e-mail/relatório já foi processado antes de gravar de novo.
"""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.processed_email import ProcessedEmail


class ProcessedEmailRepository:
    def __init__(self, db: Session):
        self.db = db

    def exists(self, message_id: str) -> bool:
        stmt = select(ProcessedEmail.id).where(ProcessedEmail.message_id == message_id)
        return self.db.scalar(stmt) is not None

    def create(self, processed_email: ProcessedEmail) -> ProcessedEmail:
        self.db.add(processed_email)
        self.db.commit()
        self.db.refresh(processed_email)
        return processed_email
