from nicegui import ui
from app.ui.theme.design_system import design
from app.ui.components.atoms.button import AppleButton

class FilePickerMolecule(ui.column):
    """
    Drag & Drop file area with visual feedback.
    """
    def __init__(self, label: str, on_pick: callable, is_folder: bool = False):
        super().__init__()
        
        self.on_pick = on_pick
        self.is_folder = is_folder
        
        # Container styles
        self.classes("w-full border-2 border-dashed border-gray-300 rounded-xl p-8 items-center justify-center gap-6 transition-all duration-300")
        self.classes("hover:border-blue-400 hover:bg-blue-50/50")
        self.style("min-height: 160px; cursor: pointer")
        
        # Content (Inside dashed box)
        with self:
            # Icon
            icon_name = "folder_open" if is_folder else "upload_file"
            ui.icon(icon_name, size="48px", color="grey-5").classes("shrink-0")
            
            # Text
            with ui.column().classes("items-center gap-1"):
                ui.label(label).classes("text-lg font-medium text-gray-700 text-center")
                ui.label("Clique para selecionar").classes("text-sm text-gray-400")

        # Click event to trigger picker
        self.on("click", self.handle_click)
        
    async def handle_click(self):
        """Opens native file picker via the callback provider."""
        # This calls the picking logic passed from parent (Dashboard)
        await self.on_pick()

    def set_selected(self, path: str):
        """Updates visual state when file is selected."""
        self.clear()
        self.classes(remove="border-gray-300", add="border-green-400 bg-green-50/30")
        
        with self:
            ui.icon("check_circle", size="42px", color="green")
            with ui.column().classes("items-center"):
                ui.label("Selecionado:").classes("text-xs text-gray-500 uppercase tracking-widest")
                ui.label(path).classes("text-base font-medium text-gray-800 break-all text-center px-4")
