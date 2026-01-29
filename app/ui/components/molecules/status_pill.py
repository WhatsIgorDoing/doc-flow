from nicegui import ui
from app.ui.theme.design_system import design

class StatusPill(ui.element):
    """
    Animated Status Badge (Pill).
    Features: Pulse animation for 'processing', solid colors for states.
    """
    def __init__(self, status: str = "idle"):
        super().__init__('div')
        
        self.classes("inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold tracking-wide transition-colors duration-300")
        
        self.dot = ui.html('<span class="relative flex h-2 w-2 mr-1"></span>')
        self.label = ui.label()
        
        self.update_status(status)
        self.move(self.label) # Ensure label is inside div

    def update_status(self, status: str, text: str = None):
        """Updates the pill appearance."""
        self.label.text = text if text else status.capitalize()
        
        # Reset colors
        self.classes(remove="bg-green-100 border-green-200 text-green-700")
        self.classes(remove="bg-blue-100 border-blue-200 text-blue-700")
        self.classes(remove="bg-gray-100 border-gray-200 text-gray-700")
        self.classes(remove="bg-red-100 border-red-200 text-red-700")
        
        self.dot.content = '<span class="relative flex h-2 w-2"></span>' # Reset dot

        if status == "success":
            self.classes(add="bg-green-50 border-green-200 text-green-700")
            self.dot.content = """
            <span class="relative flex h-2 w-2">
              <span class="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            """
        elif status == "processing":
            self.classes(add="bg-blue-50 border-blue-200 text-blue-700")
            self.dot.content = """
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            """
        elif status == "error":
            self.classes(add="bg-red-50 border-red-200 text-red-700")
            self.dot.content = """
            <span class="relative flex h-2 w-2">
              <span class="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            """
        else: # Idle / Default
            self.classes(add="bg-gray-50 border-gray-200 text-gray-600")
            self.dot.content = """
            <span class="relative flex h-2 w-2">
              <span class="relative inline-flex rounded-full h-2 w-2 bg-gray-400"></span>
            </span>
            """
