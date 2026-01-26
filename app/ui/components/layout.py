"""
Layout components for SAD App v2 UI.
Provides reusable layout structure with sidebar, header, and content area.
"""

from contextlib import contextmanager
from nicegui import ui
from app.core.config import settings


def create_header():
    """
    Creates the application header with title and connection status.

    Returns:
        NiceGUI header component
    """
    with ui.header().classes("items-center justify-between bg-primary text-white"):
        # Left side: Title
        with ui.row().classes("items-center gap-4"):
            ui.label("SAD Validator").classes("text-h5 font-bold")
            ui.label(f"v{settings.APP_VERSION}").classes("text-caption opacity-70")

        # Right side: Connection status
        with ui.row().classes("items-center gap-2"):
            # Status indicator (green/red dot)
            status_color = "green" if settings.SUPABASE_ENABLED else "grey"
            ui.icon("circle", color=status_color).classes("text-xs")

            status_text = "Online" if settings.SUPABASE_ENABLED else "Offline"
            ui.label(status_text).classes("text-body2")

            # Environment badge
            env_color = "red" if settings.is_production else "blue"
            ui.badge(settings.ENVIRONMENT, color=env_color).classes("ml-2")


def create_sidebar():
    """
    Creates the application sidebar with navigation menu.

    Returns:
        NiceGUI drawer component
    """
    with ui.left_drawer(fixed=True, bordered=True).classes("bg-grey-1"):
        with ui.column().classes("w-full gap-1 p-4"):
            # Logo/Brand section
            with ui.row().classes("items-center gap-2 mb-4"):
                ui.icon("folder_open", size="lg").classes("text-primary")
                ui.label("Menu").classes("text-h6 font-bold")

            ui.separator()

            # Menu items
            with ui.column().classes("w-full gap-1 mt-4"):
                # Dashboard
                with (
                    ui.button(icon="dashboard", on_click=lambda: ui.navigate.to("/"))
                    .props("flat align=left")
                    .classes("w-full")
                ):
                    ui.label("Dashboard").classes("ml-2")

                # Validation
                with (
                    ui.button(
                        icon="check_circle",
                        on_click=lambda: ui.navigate.to("/validate"),
                    )
                    .props("flat align=left")
                    .classes("w-full")
                ):
                    ui.label("Validar Lote").classes("ml-2")

                # Organization (future)
                with (
                    ui.button(
                        icon="folder_copy", on_click=lambda: ui.navigate.to("/organize")
                    )
                    .props("flat align=left disabled")
                    .classes("w-full")
                ):
                    ui.label("Organizar Lotes").classes("ml-2")

                ui.separator()

                # Settings (future)
                with (
                    ui.button(
                        icon="settings", on_click=lambda: ui.navigate.to("/settings")
                    )
                    .props("flat align=left disabled")
                    .classes("w-full")
                ):
                    ui.label("Configurações").classes("ml-2")

                # API Docs
                with (
                    ui.button(
                        icon="api",
                        on_click=lambda: ui.open(
                            "http://localhost:8080/docs", new_tab=True
                        ),
                    )
                    .props("flat align=left")
                    .classes("w-full")
                ):
                    ui.label("API Docs").classes("ml-2")


@contextmanager
def create_page_layout(title: str):
    """
    Creates a standard page layout with header, sidebar, and title.

    Args:
        title: Page title to display

    Returns:
        Context manager for the main content area
    """
    create_header()
    create_sidebar()

    with ui.column().classes("w-full p-4 gap-4"):
        # Page title
        ui.label(title).classes("text-h4 font-bold text-primary")
        ui.separator()

        # Content area (returned for child components)
        with ui.column().classes("w-full gap-4") as content_area:
            yield content_area
