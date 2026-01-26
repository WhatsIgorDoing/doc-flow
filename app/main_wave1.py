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

# Import UI pages (registers @ui.page routes)
from app.ui.pages import dashboard  # noqa: F401


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

# Note: UI pages are registered via @ui.page decorators on import


# Removed old index page - replaced by dashboard in app.ui.pages.dashboard


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
