"""
Log viewer component for real-time log display.
"""

from typing import Optional
from nicegui import ui


class LogViewer:
    """Component for displaying application logs in real-time."""

    def __init__(self, max_lines: int = 100):
        """
        Initialize the log viewer.

        Args:
            max_lines: Maximum number of log lines to keep
        """
        self.max_lines = max_lines
        self.log_container: Optional[ui.log] = None

    def create(self):
        """Creates the log viewer UI component."""
        with ui.card().classes("w-full"):
            ui.label("Log de Execução").classes("text-h6 font-bold mb-2")

            # Log display with fixed height and scrolling
            self.log_container = ui.log(max_lines=self.max_lines).classes(
                "w-full h-48 bg-grey-9 text-white font-mono text-sm"
            )

            # Control buttons
            with ui.row().classes("w-full justify-end mt-2 gap-2"):
                ui.button("Limpar", icon="clear", on_click=self.clear).props(
                    "outline size=sm"
                )

        return self

    def add_log(self, message: str, level: str = "INFO"):
        """
        Adds a log message to the viewer.

        Args:
            message: Log message text
            level: Log level (INFO, WARNING, ERROR, etc)
        """
        if self.log_container:
            # Format with timestamp and level
            from datetime import datetime

            timestamp = datetime.now().strftime("%H:%M:%S")
            formatted = f"[{timestamp}] {level}: {message}"
            self.log_container.push(formatted)

    def clear(self):
        """Clears all log messages."""
        if self.log_container:
            self.log_container.clear()

    def info(self, message: str):
        """Log info message."""
        self.add_log(message, "INFO")

    def warning(self, message: str):
        """Log warning message."""
        self.add_log(message, "WARNING")

    def error(self, message: str):
        """Log error message."""
        self.add_log(message, "ERROR")

    def success(self, message: str):
        """Log success message."""
        self.add_log(message, "SUCCESS")
