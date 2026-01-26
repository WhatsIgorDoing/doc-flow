"""
Services (Use Cases) refatorados para arquitetura assíncrona.
Implementa regras de negócio com injeção de dependências.
"""

import re
from pathlib import Path
from typing import Dict, List, Tuple

from app.core.logger import app_logger
from app.domain.entities import (
    DocumentFile,
    DocumentGroup,
    DocumentStatus,
    OrganizationResult,
    OutputLot,
    ValidationResult,
)
from app.domain.exceptions import ValidationError
from app.infrastructure.repositories import FileRepository, ManifestRepository


class ValidationService:
    """
    Service para validação de documentos contra manifesto.
    Implementa UC-01: Validar Lote de Documentos.
    """

    def __init__(
        self,
        manifest_repo: ManifestRepository,
        file_repo: FileRepository,
    ):
        """
        Inicializa o service com injeção de dependências.

        Args:
            manifest_repo: Repositório para leitura de manifestos
            file_repo: Repositório para operações com arquivos
        """
        self._manifest_repo = manifest_repo
        self._file_repo = file_repo

    def _get_file_base_name(self, file_name: str) -> str:
        """
        Extrai o nome base de um arquivo para correspondência (RN-NEW-001).
        Remove sufixos de revisão conhecidos.

        Examples:
            'DOC-123_A.pdf' -> 'DOC-123'
            'DOC-123_Rev0.pdf' -> 'DOC-123'
            'DOC-123.pdf' -> 'DOC-123'

        Args:
            file_name: Nome do arquivo completo

        Returns:
            Nome base sem sufixo de revisão
        """
        name_without_ext = Path(file_name).stem

        # Padrões de sufixos de revisão típicos
        revision_patterns = [
            r"_[A-Z]$",  # _A, _B, _C
            r"_Rev\d+$",  # _Rev0, _Rev1, _Rev2
            r"_rev\d+$",  # _rev0, _rev1, _rev2
            r"_\d+$",  # _0, _1, _2
            r"_final$",
            r"_temp$",
            r"_old$",
            r"_backup$",
            r"_draft$",
            r"_preliminary$",
        ]

        # Remove sufixo de revisão se encontrado
        for pattern in revision_patterns:
            if re.search(pattern, name_without_ext, re.IGNORECASE):
                return re.sub(pattern, "", name_without_ext, flags=re.IGNORECASE)

        return name_without_ext

    async def validate_batch(
        self, manifest_path: Path, source_directory: Path
    ) -> ValidationResult:
        """
        Executa validação de lote de documentos contra manifesto.

        Args:
            manifest_path: Caminho do arquivo de manifesto Excel
            source_directory: Diretório com os arquivos a validar

        Returns:
            ValidationResult com arquivos validados e não reconhecidos

        Raises:
            ValidationError: Se houver erro durante a validação
        """
        try:
            app_logger.info(
                "Starting batch validation",
                extra={
                    "manifest_path": str(manifest_path),
                    "source_directory": str(source_directory),
                },
            )

            # 1. Carrega dados do manifesto e do sistema de arquivos (paralelo)
            manifest_items = await self._manifest_repo.load_from_file(manifest_path)
            disk_files = await self._file_repo.list_files(source_directory)

            app_logger.debug(
                "Data loaded",
                extra={
                    "manifest_items": len(manifest_items),
                    "disk_files": len(disk_files),
                },
            )

            # 2. Cria dicionário para busca rápida
            manifest_map: Dict[str, ManifestItem] = {
                item.document_code: item for item in manifest_items
            }

            # 3. Inicializa listas de resultado
            validated_files: List[DocumentFile] = []
            unrecognized_files: List[DocumentFile] = []

            # 4. Itera sobre arquivos para validação
            for file in disk_files:
                base_name = self._get_file_base_name(file.path.name)

                # 5. Busca correspondência no manifesto
                matched_item = manifest_map.get(base_name)

                if matched_item:
                    # Sucesso: correspondência encontrada
                    file.status = DocumentStatus.VALIDATED
                    file.associated_manifest_item = matched_item
                    validated_files.append(file)
                else:
                    # Falha: sem correspondência
                    file.status = DocumentStatus.UNRECOGNIZED
                    unrecognized_files.append(file)

            app_logger.info(
                "Batch validation completed",
                extra={
                    "validated_count": len(validated_files),
                    "unrecognized_count": len(unrecognized_files),
                },
            )

            return ValidationResult(
                validated_count=len(validated_files),
                unrecognized_count=len(unrecognized_files),
                validated_files=validated_files,
                unrecognized_files=unrecognized_files,
                success=True,
                message=f"Validated {len(validated_files)} files, {len(unrecognized_files)} unrecognized",
            )

        except Exception as e:
            app_logger.error(
                "Validation failed",
                extra={"error": str(e), "error_type": type(e).__name__},
            )
            raise ValidationError(f"Validation failed: {e}")


# Import que estava faltando
from app.domain.entities import ManifestItem
