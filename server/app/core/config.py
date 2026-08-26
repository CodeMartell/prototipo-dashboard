"""
app/core/config.py
Configurações centrais da aplicação, lidas do .env.

"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Aplicação
    API_PORT: int = 5001
    ENVIRONMENT: str = "development"  # development | production

    # Banco de dados
    DATABASE_URL: str = ""

    # Autenticação (JWT) — usado quando  definir login próprio.
    # Se o time optar por login corporativo (Microsoft/Google via OAuth2),
    # estas variáveis são substituídas pelas do provedor OAuth.
    JWT_SECRET: str = "dev-secret-trocar-em-producao"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MINUTES: int = 60 * 8  # 8 horas

    # CORS — origem do frontend (Vite)
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Fallback de dados (compatibilidade com o protótipo atual)
    EXCEL_FALLBACK_PATH: str = "dados_dashboard.xlsx"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cache simples — evita reler o .env a cada chamada."""
    return Settings()
