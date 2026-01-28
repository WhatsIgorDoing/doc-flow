import re
from pathlib import Path
from typing import Dict, List, Tuple

from app.core.logger import app_logger
from app.domain.entities import (
    DocumentFile,
    DocumentStatus,
    ManifestItem,
    ValidationResult,
)
from app.domain.exceptions import ValidationError
from app.infrastructure.repositories import FileRepository, ManifestRepository
from app.use_cases.validate_batch import ValidateBatchUseCase


class ValidationService:
    """
    Service para validação de documentos contra manifesto.
    Atua como fachada para o ValidateBatchUseCase.
    """

    def __init__(
        self,
        manifest_repo: ManifestRepository,
        file_repo: FileRepository,
    ):
        """
        Inicializa o service com injeção de dependências.
        """
        self._Use_case = ValidateBatchUseCase(manifest_repo, file_repo)

    async def validate_batch(
        self, manifest_path: Path, source_directory: Path
    ) -> ValidationResult:
        """
        Executa validação de lote de documentos delegando para o caso de uso.
        """
        try:
            return await self._Use_case.execute(manifest_path, source_directory)
        except Exception as e:
            # O use case já loga erros, mas o service original capturava tudo e lançava ValidationError
            # Mantemos esse comportamento para compatibilidade
            raise ValidationError(f"Validation failed: {e}")

