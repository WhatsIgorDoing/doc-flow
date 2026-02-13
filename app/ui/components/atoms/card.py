from nicegui import ui
from app.ui.theme.design_system import design

class GlassCard(ui.element):
    """
    Apple-style Glassmorphism Card (Custom Div).
    Features: Surface color, slight transparency, backdrop blur, diffuse shadow.
    """
    def __init__(self, no_hover: bool = False):
        super().__init__('div')
        
        # Base classes
        self.classes(f"bg-white/80 backdrop-blur-md border border-gray-200")
        self.classes(f"{design.layout.radius_lg}")
        self.style(f"box-shadow: {design.shadows.md}")
        
        # Layout defaults
        self.classes("block relative") # Ensure it acts as a layout container

        # Interactions
        if not no_hover:
            self.classes("hover-lift cursor-default transition-all duration-300")
            
        # Standard padding
        self.classes("p-6")

    def tight(self):
        """Reduces padding for dense information."""
        self.classes(remove="p-6", add="p-4")
        return self
