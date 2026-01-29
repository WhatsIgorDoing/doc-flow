from nicegui import ui
from typing import Callable, Optional
from app.ui.theme.design_system import design

class CleanInput(ui.input):
    """
    Minimalist Input field.
    Features: No extensive borders, focus glow, clean typography.
    """
    def __init__(
        self, 
        label: str, 
        placeholder: Optional[str] = None, 
        on_change: Optional[Callable] = None, 
        icon: Optional[str] = None
    ):
        super().__init__(label=label, placeholder=placeholder, on_change=on_change)
        
        # Reset Quasar defaults
        self.props("outlined dense") # Use outlined but customize it
        
        # Styles
        # Note: Quasar inputs are hard to style with Utility classes deep inside.
        # We rely on the global 'input-focus-ring' class and props.
        
        self.classes("w-full transition-all duration-300")
        self.classes("bg-white")
        # Increasing radius via props/style hack or custom wrapper
        # For now, relying on Quasar's 'rounded' prop if available or standard
        self.props("rounded") 
        
        if icon:
            self.props(f'prepend-icon="{icon}"')

    def set_error(self, message: str):
        """Displays error state."""
        self.props(f'error error-message="{message}"')
        
    def clear_error(self):
        """Clears error state."""
        self.props(remove='error')
