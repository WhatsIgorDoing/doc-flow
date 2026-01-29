"""
Dashboard page for SAD App v2 (Refactored - Premium Tech).
"""
from pathlib import Path
from typing import Optional
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

    async def pick_manifest(self):
        """Opens file picker for Excel."""
        path = await self._open_native_picker(file=True)
        if path:
            self.manifest_path = path
            self.picker_manifest.set_selected(path)

    async def pick_folder(self):
        """Opens folder picker."""
        path = await self._open_native_picker(file=False)
        if path:
            self.source_directory = path
            self.picker_folder.set_selected(path)

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

    async def run_validation(self):
        """Executes validation."""
        if not self.manifest_path or not self.source_directory:
            ui.notify("Por favor selecione ambos os arquivos.", type="warning")
            return

        self.btn_validate.props("loading")
        
        try:
            # Service Call
            manifest_repo = ManifestRepository()
            file_repo = FileRepository()
            service = ValidationService(manifest_repo=manifest_repo, file_repo=file_repo)
            
            result = await service.validate_batch(
                manifest_path=Path(self.manifest_path),
                source_directory=Path(self.source_directory),
            )
            
            # Update UI
            self.results_section.display_results(result)
            ui.notify("Validação Concluída com Sucesso!", type="positive")
            
        except Exception as e:
            ui.notify(f"Erro: {str(e)}", type="negative")
            
        finally:
            self.btn_validate.props(remove="loading")

    def render(self):
        """Renders the Premium Dashboard."""
        apply_global_styles() # Inject CSS
        
        # Page Container (Apple Gray Background)
        with ui.column().classes("w-full min-h-screen bg-[#F5F5F7] p-8 items-center"):
            
            # Max-width Wrapper
            with ui.column().classes(f"w-full {design.layout.page_width} gap-8"):
                
                # 1. Hero
                HeroHeader()
                
                # 2. Main Action Area (Glass Card)
                with ui.column().classes("w-full"):
                    from app.ui.components.atoms.card import GlassCard
                    with GlassCard().classes("w-full grid grid-cols-1 md:grid-cols-2 gap-8 p-8"):
                        
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
                    
                    # Action Bar (floating below card)
                    with ui.row().classes("w-full justify-end mt-6"):
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
