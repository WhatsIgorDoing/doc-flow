"""
Entidades de domínio para o SAD App v2.
Modelos puros sem dependências externas, seguindo Clean Architecture.
"""

import enum
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


class DocumentStatus(enum.Enum):
    """Status de validação de um documento."""

    UNVALIDATED = "not_validated"
    VALIDATED = "validated"
    UNRECOGNIZED = "unrecognized"
    ERROR = "error"


@dataclass
class ManifestItem:
    """Representa um item do manifesto de entrada (fonte da verdade)."""

    document_code: str
    revision: str
    title: str
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DocumentFile:
    """Representa um arquivo físico no disco."""

    path: Path
    size_bytes: int
    status: DocumentStatus = DocumentStatus.UNVALIDATED
    associated_manifest_item: Optional[ManifestItem] = None

    def __post_init__(self):
        """Garante que path seja sempre um objeto Path."""
        if not isinstance(self.path, Path):
            self.path = Path(self.path)


@dataclass
class DocumentGroup:
    """Grupo de arquivos relacionados (mesmo document_code)."""

    document_code: str
    files: List[DocumentFile] = field(default_factory=list)

    @property
    def total_size_bytes(self) -> int:
        """Calcula o tamanho total de todos os arquivos do grupo."""
        return sum(file.size_bytes for file in self.files)


@dataclass
class OutputLot:
    """Lote de saída com grupos de documentos organizados."""

    lot_name: str
    groups: List[DocumentGroup] = field(default_factory=list)

    @property
    def files(self) -> List[DocumentFile]:
        """Retorna todos os arquivos de todos os grupos no lote."""
        all_files = []
        for group in self.groups:
            all_files.extend(group.files)
        return all_files

    @property
    def total_size_bytes(self) -> int:
        """Calcula o tamanho total de todos os grupos no lote."""
        return sum(group.total_size_bytes for group in self.groups)


@dataclass
class OrganizationResult:
    """Resultado da operação de organização de lotes."""

    lots_created: int = 0
    files_moved: int = 0
    success: bool = True
    message: str = "Operation completed successfully"


@dataclass
class ValidationResult:
    """Resultado da operação de validação de documentos."""

    validated_count: int = 0
    unrecognized_count: int = 0
    validated_files: List[DocumentFile] = field(default_factory=list)
    unrecognized_files: List[DocumentFile] = field(default_factory=list)
    success: bool = True
    message: str = "Validation completed successfully"
