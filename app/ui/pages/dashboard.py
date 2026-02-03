"""
Dashboard page for SAD App v2 (Refactored - Premium Tech).
"""
from pathlib import Path
from typing import Optional
import traceback
from nicegui import ui, run

from app.core.logger import app_logger
from app.domain.exceptions import SADError
from app.infrastructure.repositories import FileRepository, ManifestRepository
from app.services.validation_service import ValidationService

# Import New Design System
from app.ui.theme.global_styles import apply_global_styles
from app.ui.theme.design_system import design
from app.ui.components.organisms.hero import HeroHeader
from app.ui.components.molecules.file_picker import FilePickerMolecule
from app.ui.components.atoms.button import AppleButton
from app.ui.components.organisms.results import ResultsList

class ValidationDashboard:
    """Refactored Dashboard using Atomic Design."""

    def __init__(self):
        self.manifest_path: Optional[str] = None
        self.source_directory: Optional[str] = None
        self.is_validating: bool = False
        
        # Refs
        self.results_section = None 
        self.status_label = None

    async def pick_manifest(self):
        """Opens file picker for Excel."""
        path = await self._open_native_picker(file=True)
        if path:
            self.manifest_path = path
            self.picker_manifest.set_selected(path)
            self._update_status()

    async def pick_folder(self):
        """Opens folder picker."""
        path = await self._open_native_picker(file=False)
        if path:
            self.source_directory = path
            self.picker_folder.set_selected(path)
            self._update_status()

    async def _open_native_picker(self, file: bool = True):
        """Helper for native dialog."""
        def _dialog():
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            if file:
                return filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx *.xls")])
            return filedialog.askdirectory()
            root.destroy()
        
        ui.notify("Abrindo janela de seleção... Verifique sua barra de tarefas.", type="info", timeout=3000)
        return await run.io_bound(_dialog)

    def _update_status(self, text: str = None):
        """Updates the status label."""
        if self.status_label:
            if text:
                self.status_label.text = text
            elif self.manifest_path and self.source_directory:
                self.status_label.text = "Pronto para iniciar a validação."
                self.status_label.classes(remove="text-gray-400", add="text-gray-600")
            else:
                self.status_label.text = "Selecione os arquivos para começar."
                self.status_label.classes(remove="text-gray-600", add="text-gray-400")

    def reset_state(self):
        """Resets the dashboard state."""
        self.manifest_path = None
        self.source_directory = None
        
        # Visual Reset requires rebuilding or exposing clear methods on molecules
        # For simplicity in this iteration, we reload the page or clear components if possible
        ui.open("/")

    async def run_validation(self):
        """Executes validation with rich feedback."""
        if not self.manifest_path or not self.source_directory:
            ui.notify("Por favor selecione ambos os arquivos.", type="warning")
            return

        self.btn_validate.props("loading")
        self._update_status("Iniciando motor de validação...")
        
        try:
            # Service Call
            from app.infrastructure.database import db_manager
            manifest_repo = ManifestRepository()
            file_repo = FileRepository()
            service = ValidationService(manifest_repo=manifest_repo, file_repo=file_repo, db_manager=db_manager)
            
            self._update_status("Processando arquivos e cruzando dados...")
            
            # Note: For even richer feedback (percentages), we'd need a callback in the service
            result = await service.validate_batch(
                manifest_path=Path(self.manifest_path),
                source_directory=Path(self.source_directory),
            )
            
            # Update UI
            self._update_status("Finalizando renderização...")
            self.results_section.display_results(result)
            self._update_status(f"Concluído: {len(result.validated_files)} validados, {len(result.unrecognized_files)} desconhecidos.")
            
            ui.notify("Validação Concluída com Sucesso!", type="positive")
            
        except Exception as e:
            err_msg = str(e)
            stack = traceback.format_exc()
            self._update_status("Erro durante o processamento.")
            
            # Dialog for Error
            with ui.dialog() as dialog, ui.card().classes("w-full max-w-lg"):
                 with ui.row().classes("items-center gap-2 text-red-600 mb-2"):
                     ui.icon("error", size="md")
                     ui.label("Falha na Validação").classes("text-xl font-bold")
                 
                 ui.label(err_msg).classes("font-medium mb-4")
                 
                 with ui.expansion("Detalhes Técnicos", icon="code").classes("w-full bg-red-50"):
                     ui.code(stack).classes("text-xs")

                 with ui.row().classes("w-full justify-end mt-4"):
                     ui.button("Fechar", on_click=dialog.close).props("flat")
            
            dialog.open()
            
        finally:
            self.btn_validate.props(remove="loading")

    def render(self):
        """Renders the Premium Dashboard with improved UX."""
        apply_global_styles() # Inject CSS
        
        # Page Container
        with ui.column().classes("w-full min-h-screen bg-[#F5F5F7] p-8 items-center"):
            
            # Max-width Wrapper
            with ui.column().classes(f"w-full {design.layout.page_width} gap-10"):
                
                # 1. Hero
                HeroHeader()
                
                # 2. Main Input & Action Area (Glass Card)
                with ui.column().classes("w-full"):
                    from app.ui.components.atoms.card import GlassCard
                    
                    # Changed to flex-col to integrate footer
                    with GlassCard().classes("w-full flex flex-col p-8 gap-8"):
                        
                        # Input Grid
                        with ui.grid(columns=2).classes("w-full gap-8"):
                             # Left: Manifest Picker
                            self.picker_manifest = FilePickerMolecule(
                                "Importar Manifesto (.xlsx)",
                                self.pick_manifest
                            )
                            
                            # Right: Folder Picker
                            self.picker_folder = FilePickerMolecule(
                                "Selecionar Pasta de Documentos",
                                self.pick_folder,
                                is_folder=True
                            )

                        # Footer: Status & Actions
                        with ui.row().classes("w-full items-center justify-between pt-6 border-t border-gray-200/60"):
                            
                            # Status Indicator
                            with ui.row().classes("items-center gap-2"):
                                ui.spinner(size="sm").bind_visibility_from(self, 'is_validating')
                                self.status_label = ui.label("Selecione os arquivos para começar.").classes("text-gray-400 font-medium")

                            # Action Buttons
                            with ui.row().classes("gap-4"):
                                ui.button("Limpar", on_click=self.reset_state).props("flat text-color=grey-7")
                                
                                self.btn_validate = AppleButton(
                                    "Iniciar Validação",
                                    icon="play_circle",
                                    size="lg",
                                    on_click=self.run_validation
                                )


                # 3. Results Section
                self.results_section = ResultsList()


@ui.page("/")
def dashboard_page():
    ValidationDashboard().render()
