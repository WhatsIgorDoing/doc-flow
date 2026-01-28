"""
Dashboard page for SAD App v2.
Main interface for batch validation workflow.
"""

from pathlib import Path
from typing import Optional

from nicegui import ui

from app.core.logger import app_logger
from app.domain.exceptions import SADError
from app.infrastructure.repositories import FileRepository, ManifestRepository
from app.services.validation_service import ValidationService
from app.ui.components.layout import create_page_layout
from app.ui.components.log_viewer import LogViewer


class ValidationDashboard:
    """Dashboard for document validation workflow."""

    def __init__(self):
        """Initialize dashboard state."""
        self.manifest_path: Optional[str] = None
        self.source_directory: Optional[str] = None
        self.is_validating: bool = False

        # UI components
        self.manifest_input: Optional[ui.input] = None
        self.directory_input: Optional[ui.input] = None
        self.validate_button: Optional[ui.button] = None
        self.results_card: Optional[ui.card] = None
        self.log_viewer: LogViewer = LogViewer()

    def create_file_picker_button(
        self, input_field: ui.input, picker_type: str = "file"
    ):
        """
        Creates a button that opens native file/folder picker.
        Uses tkinter.filedialog for native OS dialog.

        Args:
            input_field: Input field to update with selected path
            picker_type: 'file' for file picker, 'folder' for folder picker
        """

        from nicegui import run

        async def pick_path():
            def _open_picker():
                try:
                    import tkinter as tk
                    from tkinter import filedialog
                    
                    # Create hidden tkinter root
                    root = tk.Tk()
                    root.withdraw()
                    root.attributes("-topmost", True)
                    
                    result = None
                    if picker_type == "file":
                        result = filedialog.askopenfilename(
                            title="Selecione o Manifesto Excel",
                            filetypes=[
                                ("Excel files", "*.xlsx *.xls"),
                                ("All files", "*.*"),
                            ],
                        )
                    else:  # folder
                        result = filedialog.askdirectory(
                            title="Selecione a Pasta de Documentos"
                        )
                    
                    root.destroy()
                    return result
                except Exception as e:
                    return e

            # Executa em thread separada para não bloquear
            result = await run.io_bound(_open_picker)

            if isinstance(result, Exception):
                 self.log_viewer.error(f"Erro ao abrir seletor: {result}")
            elif result:
                input_field.value = result
                self.log_viewer.info(f"Caminho selecionado: {result}")

        ui.button(icon="folder_open", on_click=pick_path).props("flat").tooltip(
            "Abrir seletor de arquivos"
        )

    def validate_paths(self) -> bool:
        """
        Validates that input paths are set and exist.

        Returns:
            True if validation passes, False otherwise
        """
        if not self.manifest_path:
            ui.notify("Selecione o arquivo de manifesto", type="warning")
            self.log_viewer.warning("Manifesto não selecionado")
            return False

        if not self.source_directory:
            ui.notify("Selecione a pasta de documentos", type="warning")
            self.log_viewer.warning("Pasta de documentos não selecionada")
            return False

        # Check if paths exist
        manifest_file = Path(self.manifest_path)
        if not manifest_file.exists():
            ui.notify("Arquivo de manifesto não encontrado", type="negative")
            self.log_viewer.error(f"Manifesto não existe: {self.manifest_path}")
            return False

        source_dir = Path(self.source_directory)
        if not source_dir.exists():
            ui.notify("Pasta de documentos não encontrada", type="negative")
            self.log_viewer.error(f"Pasta não existe: {self.source_directory}")
            return False

        if not source_dir.is_dir():
            ui.notify("O caminho especificado não é uma pasta", type="negative")
            self.log_viewer.error(f"Não é um diretório: {self.source_directory}")
            return False

        return True

    async def run_validation(self):
        """
        Executes the validation process.
        Calls ValidationService directly (no HTTP request).
        """
        if self.is_validating:
            ui.notify("Validação já em andamento", type="info")
            return

        if not self.validate_paths():
            return

        try:
            self.is_validating = True
            self.validate_button.props("loading")
            self.log_viewer.clear()

            self.log_viewer.info("Iniciando validação de lote...")
            self.log_viewer.info(f"Manifesto: {self.manifest_path}")
            self.log_viewer.info(f"Pasta: {self.source_directory}")

            # Create service with dependencies
            manifest_repo = ManifestRepository()
            file_repo = FileRepository()
            service = ValidationService(
                manifest_repo=manifest_repo, file_repo=file_repo
            )

            # Execute validation
            self.log_viewer.info("Carregando manifesto...")
            result = await service.validate_batch(
                manifest_path=Path(self.manifest_path),
                source_directory=Path(self.source_directory),
            )

            # Display results
            self.log_viewer.success(f"Validação concluída!")
            self.log_viewer.info(f"Arquivos validados: {result.validated_count}")
            self.log_viewer.info(
                f"Arquivos não reconhecidos: {result.unrecognized_count}"
            )

            self.display_results(result)

            ui.notify(
                f"Validação concluída: {result.validated_count} validados",
                type="positive",
            )

            app_logger.info(
                "Validation completed via UI",
                extra={
                    "validated_count": result.validated_count,
                    "unrecognized_count": result.unrecognized_count,
                },
            )

        except SADError as e:
            error_msg = f"Erro na validação: {str(e)}"
            self.log_viewer.error(error_msg)
            ui.notify(error_msg, type="negative")
            app_logger.error("Validation failed via UI", extra={"error": str(e)})

        except Exception as e:
            error_msg = f"Erro inesperado: {str(e)}"
            self.log_viewer.error(error_msg)
            ui.notify("Erro inesperado na validação", type="negative")
            app_logger.error(
                "Unexpected error in UI validation",
                extra={"error": str(e), "error_type": type(e).__name__},
            )

        finally:
            self.is_validating = False
            self.validate_button.props(remove="loading")

    def display_results(self, result):
        """
        Displays validation results in a card.

        Args:
            result: ValidationResult object
        """
        if self.results_card:
            self.results_card.clear()
        else:
            # Create results card if it doesn't exist
            with ui.column().classes("w-full"):
                self.results_card = ui.card().classes("w-full")

        with self.results_card:
            ui.label("Resultados da Validação").classes("text-h6 font-bold mb-4")

            # Summary stats
            with ui.row().classes("w-full gap-4"):
                # Validated files card
                with ui.card().classes("flex-1"):
                    with ui.column().classes("items-center"):
                        ui.icon("check_circle", size="xl", color="positive")
                        ui.label(str(result.validated_count)).classes(
                            "text-h4 font-bold text-positive"
                        )
                        ui.label("Validados").classes("text-caption")

                # Unrecognized files card
                with ui.card().classes("flex-1"):
                    with ui.column().classes("items-center"):
                        ui.icon("warning", size="xl", color="warning")
                        ui.label(str(result.unrecognized_count)).classes(
                            "text-h4 font-bold text-warning"
                        )
                        ui.label("Não Reconhecidos").classes("text-caption")

            # File lists (expandable)
            if result.validated_files:
                with ui.expansion("Arquivos Validados", icon="check_circle").classes(
                    "w-full mt-4"
                ):
                    with ui.list().classes("w-full"):
                        for file in result.validated_files[:10]:  # Show first 10
                            with ui.item():
                                with ui.item_section():
                                    ui.label(file.path.name).classes("text-body2")

                        if len(result.validated_files) > 10:
                            ui.item_label(
                                f"... e mais {len(result.validated_files) - 10} arquivos"
                            ).classes("text-caption text-grey")

            if result.unrecognized_files:
                with ui.expansion("Arquivos Não Reconhecidos", icon="warning").classes(
                    "w-full mt-2"
                ):
                    with ui.list().classes("w-full"):
                        for file in result.unrecognized_files[:10]:  # Show first 10
                            with ui.item():
                                with ui.item_section():
                                    ui.label(file.path.name).classes(
                                        "text-body2 text-warning"
                                    )

                        if len(result.unrecognized_files) > 10:
                            ui.item_label(
                                f"... e mais {len(result.unrecognized_files) - 10} arquivos"
                            ).classes("text-caption text-grey")

    def render(self):
        """Renders the dashboard UI."""
        with create_page_layout("Dashboard - Validação de Lote"):
            # Instructions card
            with ui.card().classes("w-full"):
                ui.label("Instruções").classes("text-h6 font-bold mb-2")
                with ui.column().classes("gap-1"):
                    ui.label("1. Selecione o arquivo de manifesto Excel (.xlsx)")
                    ui.label("2. Selecione a pasta contendo os documentos a validar")
                    ui.label("3. Clique em 'Validar Lote' para iniciar o processo")

            # Input section
            with ui.card().classes("w-full"):
                ui.label("Configuração").classes("text-h6 font-bold mb-4")

                with ui.column().classes("w-full gap-4"):
                    # Manifest file input
                    with ui.row().classes("w-full items-end gap-2"):
                        self.manifest_input = (
                            ui.input(
                                label="Arquivo de Manifesto (Excel)",
                                placeholder="C:/caminho/para/manifesto.xlsx",
                                on_change=lambda e: setattr(
                                    self, "manifest_path", e.value
                                ),
                            )
                            .classes("flex-1")
                            .props("outlined")
                        )

                        self.create_file_picker_button(self.manifest_input, "file")

                    # Source directory input
                    with ui.row().classes("w-full items-end gap-2"):
                        self.directory_input = (
                            ui.input(
                                label="Pasta de Documentos",
                                placeholder="C:/caminho/para/documentos",
                                on_change=lambda e: setattr(
                                    self, "source_directory", e.value
                                ),
                            )
                            .classes("flex-1")
                            .props("outlined")
                        )

                        self.create_file_picker_button(self.directory_input, "folder")

                    # Validate button
                    self.validate_button = (
                        ui.button(
                            "Validar Lote",
                            icon="play_arrow",
                            on_click=self.run_validation,
                        )
                        .props("size=lg")
                        .classes("w-full bg-primary")
                    )

            # Log viewer
            self.log_viewer.create()

            # Results placeholder (will be populated after validation)
            ui.separator()


@ui.page("/")
@ui.page("/validate")
def dashboard_page():
    """Main dashboard page route."""
    dashboard = ValidationDashboard()
    dashboard.render()
