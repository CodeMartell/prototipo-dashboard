"""
app/schemas/auth_schema.py
DTOs do fluxo de autenticação.

TODO(): se o login corporativo (Microsoft/Google) for escolhido no
lugar de login próprio, este schema muda para receber o token OAuth2 do
provedor em vez de email/senha.
"""
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: EmailStr
    name: str | None = None
    role: str

    model_config = {"from_attributes": True}
