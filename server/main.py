"""
main.py
Entry point — instancia o FastAPI, registra middlewares, exception
handlers e os routers de cada controller.
Equivalente ao server.ts do projeto Node/Express.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.controllers import (
    analysis_controller,
    auth_controller,
    dashboard_controller,
    ingestion_controller,
    user_controller,
)
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import logger

settings = get_settings()

app = FastAPI(
    title="Dashboard KPI Logístico — API",
    version="1.0.0",
    # /docs e /openapi.json ficam disponíveis automaticamente, sem
    # precisar escrever um swagger.ts manual como no projeto Node.
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Request
import time

@app.middleware("http")
async def access_log_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    if request.url.path.startswith("/api/"):
        duration = time.time() - start_time
        logger.info(
            "[ACCESS] %s %s %s %s %s %.3fs",
            request.client.host if request.client else "unknown",
            request.method,
            request.url.path,
            request.url.scheme,
            response.status_code,
            duration
        )
    return response

register_exception_handlers(app)

app.include_router(auth_controller.router)
app.include_router(user_controller.router)
app.include_router(dashboard_controller.router)
app.include_router(analysis_controller.router)
app.include_router(ingestion_controller.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


if __name__ == "__main__":
    import uvicorn

    logger.info("Iniciando servidor na porta %d...", settings.API_PORT)
    uvicorn.run("main:app", host="0.0.0.0", port=settings.API_PORT, reload=True)
