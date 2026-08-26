"""
app/database/base.py
Base declarativa do SQLAlchemy — todo model herda daqui.
Equivalente ao schema.prisma (mas sem gerar código; os models Python
usados aqui e o alembic são a fonte da verdade do schema).
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
