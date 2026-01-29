from nicegui import ui
from typing import Callable, Optional
from app.ui.theme.design_system import design

class AppleButton(ui.button):
    """
    Apple-style Premium Button.
    Features: Smooth corners, subtle gradient/flat, scale on click.
    """
    def __init__(
        self, 
        text: str, 
        on_click: Optional[Callable] = None, 
        icon: Optional[str] = None,
        color: str = "primary",  # primary, secondary, ghost, danger
        size: str = "md"         # sm, md, lg
    ):
        super().__init__(text, on_click=on_click, icon=icon)
        
        # Reset Quasar defaults
        self.props("unelevated no-caps") # No shadow (we add custom), No Uppercase
        
        # Base functionality
        self.classes("font-medium transition-transform duration-100 active:scale-95")
        self.classes(design.layout.radius_full) # Pill shape often used, or rounded-lg
        
        # Color variants
        if color == "primary":
            self.classes("text-white")
            self.style(f"background-color: {design.colors.primary}")
            self.classes("shadow-sm hover:shadow-md hover:brightness-105")
            
        elif color == "secondary":
            self.classes("text-gray-900 bg-gray-100 hover:bg-gray-200")
            
        elif color == "ghost":
            self.classes("text-gray-600 bg-transparent hover:bg-gray-100")
            self.props("flat")
            
        elif color == "danger":
            self.classes("text-white")
            self.style(f"background-color: {design.colors.error}")
        
        # Size variants
        if size == "sm":
            self.classes("px-3 py-1 text-sm")
        elif size == "md":
            self.classes("px-5 py-2 text-base")
        elif size == "lg":
            self.classes("px-8 py-3 text-lg")
