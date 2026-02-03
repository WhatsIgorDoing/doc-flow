from nicegui import ui
from app.ui.theme.design_system import design
from app.ui.components.molecules.status_pill import StatusPill
from app.core.config import settings

def HeroHeader():
    """
    Command-center style Header/Hero section.
    """
    with ui.row().classes("w-full items-center justify-between mb-8"):
        
        # Left: Title & Context
        with ui.column().classes("gap-2"):
            with ui.row().classes("items-center gap-3"):
                ui.icon("verified", size="md", color="primary")
                ui.label("Validação de Documentos").classes(design.typo.h2 + " text-gray-900")
            
            ui.label("Gerencie, valide e organize seus lotes de entrega.").classes(design.typo.body + " text-gray-500 pl-1")

        # Right: System Status
        with ui.row().classes("items-center gap-4 bg-white/50 p-2 rounded-2xl border border-white/60"):
            # Environment Badge
            with ui.row().classes("items-center px-3 py-1 bg-gray-100 rounded-lg"):
                ui.label(settings.ENVIRONMENT.upper()).classes("text-xs font-bold text-gray-500 tracking-wider")
            
            # Connection Status
            status = "success" if settings.SUPABASE_ENABLED else "idle"
            status_text = "Online" if settings.SUPABASE_ENABLED else "Local Only"
            StatusPill(status).update_status(status, status_text)
