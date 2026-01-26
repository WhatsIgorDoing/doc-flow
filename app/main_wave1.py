"""
Entry point minimalista para Wave 1 - Backend Isolation & Setup.
Apenas inicializa FastAPI + NiceGUI com UI básica.
"""

import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from nicegui import ui

from app.core.config import settings
from app.core.logger import app_logger
from app.infrastructure.database import DatabaseManager
from app.api.endpoints import router as api_router


# Database manager global
db = DatabaseManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle: startup e shutdown da aplicação."""
    # Startup
    app_logger.info(
        "Starting SAD App v2 - Wave 1",
        extra={
            "version": settings.APP_VERSION,
            "environment": settings.ENVIRONMENT,
            "database": str(settings.get_database_path()),
        },
    )

    # Inicializa banco de dados
    db.init_db()
    app_logger.info("Database initialized")

    yield

    # Shutdown
    app_logger.info("Shutting down SAD App v2")


# FastAPI app com lifecycle
app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION, lifespan=lifespan)

# Registra rotas da API
app.include_router(api_router)


@ui.page("/")
def index_page():
    """Página inicial minimalista mostrando que o backend está online."""
    with ui.column().classes("w-full items-center justify-center h-screen"):
        ui.label("SAD App v2 - Backend Online").classes("text-h3 text-primary")
        ui.label(f"Versão: {settings.APP_VERSION}").classes("text-subtitle1 text-grey")
        ui.label(f"Ambiente: {settings.ENVIRONMENT}").classes("text-caption")

        # Status do banco de dados
        with ui.card().classes("mt-8 p-4"):
            ui.label("🗄️ Status do Sistema").classes("text-h6 mb-2")
            ui.label(f"Banco de dados: {settings.get_database_path()}").classes(
                "text-body2"
            )
            ui.label("✅ Database inicializado").classes("text-positive")


def main():
    """Entry point da aplicação."""
    app_logger.info(f"Launching {settings.APP_NAME} v{settings.APP_VERSION}")

    # Integra NiceGUI com FastAPI
    ui.run_with(app, storage_secret=settings.SECRET_KEY)

    # Roda o servidor com uvicorn
    uvicorn.run(
        app,
        host=settings.HOST,
        port=settings.PORT,
        log_level="info",
    )


if __name__ == "__main__":
    main()
