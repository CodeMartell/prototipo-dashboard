"""
app/schemas/user_schema.py
DTOs de gestão de usuário — separado de auth_schema.py porque aqui é
cadastro/edição, não login/token.
"""
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    name: str | None = None
    password: str
    role_name: str = "ADMIN"


class UserUpdate(BaseModel):
    name: str | None = None
    role_name: str | None = None
