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
from app.infrastructure.database import DatabaseManager
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
        db_manager: DatabaseManager,
    ):
        """
        Inicializa o service com injeção de dependências.
        """
        self._Use_case = ValidateBatchUseCase(manifest_repo, file_repo)
        self._db_manager = db_manager

    async def validate_batch(
        self, manifest_path: Path, source_directory: Path
    ) -> ValidationResult:
        """
        Executa validação de lote de documentos delegando para o caso de uso.
        
        Persiste os resultados validados no banco de dados para passos subsequentes.
        """
        try:
            result = await self._Use_case.execute(manifest_path, source_directory)
            
            # Persiste documentos validados se houver sucesso parcial ou total
            if result.validated_files:
                self._db_manager.save_validated_documents(
                    self._db_manager.session_id, result.validated_files
                )
                
            return result
        except Exception as e:
            # O use case já loga erros, mas o service original capturava tudo e lançava ValidationError
            # Mantemos esse comportamento para compatibilidade
            raise ValidationError(f"Validation failed: {e}")

