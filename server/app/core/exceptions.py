"""
app/core/exceptions.py
Exceções de domínio + registro de handlers globais no FastAPI.
Controllers levantam essas exceções; nunca retornam JSON de erro na mão.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import OperationalError, ProgrammingError


class DomainError(Exception):
    """Erro de regra de negócio (ex: dado inválido, recurso não encontrado)."""

    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(DomainError):
    def __init__(self, message: str = "Recurso não encontrado"):
        super().__init__(message, status_code=404)


class UnauthorizedError(DomainError):
    def __init__(self, message: str = "Não autenticado"):
        super().__init__(message, status_code=401)


class ForbiddenError(DomainError):
    def __init__(self, message: str = "Sem permissão para esta ação"):
        super().__init__(message, status_code=403)


def register_exception_handlers(app: FastAPI) -> None:
    """Chamado em main.py — padroniza toda resposta de erro em { "error": "..." }."""

    @app.exception_handler(DomainError)
    async def domain_error_handler(_: Request, exc: DomainError):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.message})

    @app.exception_handler(OperationalError)
    async def database_unavailable_handler(_: Request, exc: OperationalError):
        # O bot de extração e este backend compartilham o mesmo Postgres —
        # se ele cair, é melhor devolver 503 claro do que um 500 genérico.
        return JSONResponse(
            status_code=503,
            content={"error": "Banco de dados indisponível no momento. Tente novamente em instantes."},
        )

    @app.exception_handler(ProgrammingError)
    async def missing_table_handler(_: Request, exc: ProgrammingError):
        # Acontece quando o bot de extração (Épico 2/3) ainda não rodou
        # initialize() nesse banco — a tabela de KPI simplesmente não existe ainda.
        return JSONResponse(
            status_code=503,
            content={
                "error": (
                    "Dados de KPI ainda não disponíveis neste banco. "
                    "O bot de extração precisa rodar pelo menos uma vez antes."
                )
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(_: Request, exc: Exception):
        return JSONResponse(status_code=500, content={"error": "Erro interno do servidor"})
