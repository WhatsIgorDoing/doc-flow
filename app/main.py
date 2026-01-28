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
from app.workers.sync_worker import sync_worker
from app.ui.pages.dashboard import ValidationDashboard
from app.api.endpoints import router as api_router

# Registra rotas da API
app.include_router(api_router)

# ... (skip to Line 101)

# Página principal
@ui.page("/")
def main_page():
    """Página principal."""
    dashboard = ValidationDashboard()
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
