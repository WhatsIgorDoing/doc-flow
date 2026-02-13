"""
Controller for SAD App v2.
"""
from pathlib import Path
from typing import Any

from app.use_cases.validate_batch import ValidateBatchUseCase

class Controller:
    """
    Controller responsible for handling UI interactions and invoking use cases.
    """

    def __init__(self, validate_batch_use_case: ValidateBatchUseCase, view: Any):
        self.validate_batch_use_case = validate_batch_use_case
        self.view = view
        self.manifest_path: Path = Path("/default/manifest.xlsx")
        self.source_directory: Path = Path("/default/docs")
        self.last_validation_result = None

    def _update_results(self, result: Any):
        """Callback to update UI results."""
        pass

    async def start_validation(self):
        """
        Starts the validation process.
        """
        # Executa o use case
        result = await self.validate_batch_use_case.execute(
            manifest_path=self.manifest_path, source_directory=self.source_directory
        )

        self.view.progress_bar.set(0.8)
        self.last_validation_result = result

        # Atualiza a interface na thread principal
        self.view.after(0, self._update_results, result)
