from nicegui import ui
from app.ui.theme.design_system import design
from app.ui.components.atoms.card import GlassCard

class ResultsList(GlassCard):
    """
    Results list with staggered entry animations.
    """
    def __init__(self):
        super().__init__()
        self.classes("w-full transition-all duration-500 hidden") # Hidden initially
        self.style("min-height: 200px")
        
        with self:
             with ui.row().classes("w-full items-center justify-between mb-6"):
                 ui.label("Resultados do Processamento").classes(design.typo.h3)
                 self.status_label = ui.label("Aguardando...").classes("text-gray-400 font-medium")

             # Grid for stats
             with ui.grid(columns=3).classes("w-full gap-4 mb-6"):
                 self.stat_card("Total", "0", "bg-gray-50 text-gray-600")
                 self.stat_card("Sucesso", "0", "bg-green-50 text-green-600")
                 self.stat_card("Erros", "0", "bg-red-50 text-red-600")

             ui.separator().classes("mb-4 opacity-50")
             
             # List container
             self.list_container = ui.column().classes("w-full gap-3")

    def stat_card(self, label, value, color_class):
         with ui.column().classes(f"p-4 rounded-xl items-center justify-center {color_class}"):
             ui.label(value).classes("text-3xl font-bold")
             ui.label(label).classes("text-xs uppercase tracking-widest opacity-80")

    def display_results(self, result):
        """Populates the list with animation."""
        self.classes(remove="hidden") # Show card
        self.list_container.clear()
        
        # Update stats (Pseudo-implementation, needing element refs if we stored them, or just rebuild)
        # For simplicity in this demo, we rebuild the whole card content or just the list?
        # Ideally we'd bind specific elements. For now let's just populate the list.
        
        # Validated Files
        for i, file in enumerate(result.validated_files):
            self.create_list_item(file.path.name, "check_circle", "text-green-500", i * 50)
            
        # Unrecognized Files
        for i, file in enumerate(result.unrecognized_files):
            self.create_list_item(file.path.name, "warning", "text-orange-500", (i * 50) + 200)

    def create_list_item(self, text, icon, color, delay_ms):
        """Creates a row with slide-in animation."""
        with self.list_container:
            with ui.row().classes(f"w-full p-3 bg-gray-50/50 rounded-lg items-center gap-3 transform transition-all duration-500 translate-y-4 opacity-0 user-row"):
                ui.icon(icon).classes(color)
                ui.label(text).classes("text-sm font-medium text-gray-700 truncate flex-1")
        
        # Trigger animation via JS
        ui.run_javascript(f"""
            setTimeout(() => {{
                const rows = document.querySelectorAll('.user-row');
                const last = rows[rows.length-1];
                if(last) {{
                    last.classList.remove('translate-y-4', 'opacity-0');
                }}
            }}, {delay_ms});
        """)
