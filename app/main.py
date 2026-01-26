"""
Ponto de entrada da aplicação.
Integra NiceGUI em modo nativo (desktop).
"""

import asyncio
import uuid
import platform
import psutil

from nicegui import app, ui

from app.core.config import settings
from app.core.logger import app_logger
from app.core.device_id import device_manager
from app.core.constants import EventType
from app.infrastructure.database import db_manager
from app.workers.sync_worker import sync_worker
from app.ui.pages.dashboard import Dashboard


# Variáveis globais para sessão
_session_id = None
_device_id = None


async def startup():
    """Executado no startup da aplicação."""
    global _session_id, _device_id

    app_logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Inicializa banco de dados
    db_manager.init_db()

    # Cria sessão
    _device_id = device_manager.get_device_id()
    _session_id = str(uuid.uuid4())

    memory_info = psutil.virtual_memory()
    db_manager.create_session(
        device_id=_device_id,
        session_id=_session_id,
        app_version=settings.APP_VERSION,
        os_name=platform.system(),
        os_version=platform.version(),
        memory_mb=int(memory_info.available / (1024 * 1024)),
    )

    # Loga evento de start
    db_manager.log_event(
        session_id=_session_id, device_id=_device_id, event_type=EventType.APP_START
    )

    # Inicia worker de sincronização
    await sync_worker.start()

    app_logger.info("Application started successfully")


async def shutdown():
    """Executado no shutdown da aplicação."""
    global _session_id, _device_id

    app_logger.info("Shutting down application")

    # Para worker de sincronização
    await sync_worker.stop()

    # Loga evento de stop
    if _session_id and _device_id:
        db_manager.log_event(
            session_id=_session_id, device_id=_device_id, event_type=EventType.APP_STOP
        )

    # Força uma última sincronização
    await sync_worker.force_sync()

    app_logger.info("Application stopped")


# Configura callbacks de lifecycle
app.on_startup(startup)
app.on_shutdown(shutdown)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Endpoint de health check."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "sync_status": sync_worker.get_status(),
    }


# Página principal
@ui.page("/")
def main_page():
    """Página principal."""
    dashboard = Dashboard()
    dashboard.render()


def run():
    """Executa a aplicação."""
    ui.run(
        title=settings.APP_NAME,
        native=True,  # Modo desktop (janela nativa)
        window_size=(1024, 768),
        reload=False,
        show=True,
        port=8080,
    )


if __name__ == "__main__":
    run()
