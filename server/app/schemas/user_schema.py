"""
app/schemas/user_schema.py
DTOs de gestão de usuário — separado de auth_schema.py porque aqui é
cadastro/edição, não login/token.
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    name: str | None = None
    password: str
    role_name: str = "VIEWER"


class UserUpdate(BaseModel):
    name: str | None = None


class UserRoleUpdate(BaseModel):
    role_name: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str | None = None
    role: str
    permissions: list[str] = []
    created_at: datetime | None = None

    model_config = {"from_attributes": True}

