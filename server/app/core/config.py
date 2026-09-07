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

    # CORS — origem(ns) do frontend. Aceita uma origem ou várias separadas
    # por vírgula, para cobrir o caso de dev local consumindo uma API remota:
    #   FRONTEND_ORIGIN=https://meu-dominio,http://localhost:5173
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    # Regex opcional para origens dinâmicas — o caso concreto são os deploys
    # de preview da Vercel, que ganham um subdomínio novo a cada branch.
    # Deixe vazio para permitir só o que está em FRONTEND_ORIGIN.
    # Exemplo: r"https://materials-dashboard-[a-z0-9-]+\.vercel\.app"
    FRONTEND_ORIGIN_REGEX: str = ""

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.FRONTEND_ORIGIN.split(",") if origin.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        return self.FRONTEND_ORIGIN_REGEX.strip() or None

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
