import enum
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional


# Enum para o status dos arquivos, garantindo consistência.
class DocumentStatus(enum.Enum):
    UNVALIDATED = "Não Validado"
    VALIDATED = "Validado"
    UNRECOGNIZED = "Não Reconhecido"
    ERROR = "Erro"


@dataclass
class ManifestItem:
    """Representa uma linha do manifesto de entrada (a fonte da verdade)."""

    document_code: str
    revision: str
    title: str
    # Usamos um dicionário para metadados extras para flexibilidade.
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DocumentFile:
    """Representa um arquivo físico no disco."""

    path: Path
    size_bytes: int
    status: DocumentStatus = DocumentStatus.UNVALIDATED
    # A associação é feita após a validação bem-sucedida.
    associated_manifest_item: Optional[ManifestItem] = None

    def __post_init__(self):
        # Garante que o path seja sempre um objeto Path.
        if not isinstance(self.path, Path):
            self.path = Path(self.path)


@dataclass
class DocumentGroup:
    """Representa um grupo de arquivos relacionados (mesmo document_code)."""

    document_code: str
    files: List[DocumentFile] = field(default_factory=list)

    @property
    def total_size_bytes(self) -> int:
        """Calcula o tamanho total de todos os arquivos do grupo."""
        return sum(file.size_bytes for file in self.files)


@dataclass
class OutputLot:
    """Representa um lote de saída com grupos de documentos organizados."""

    lot_name: str
    groups: List["DocumentGroup"] = field(default_factory=list)

    # Mantém compatibilidade com código existente
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
    """Estrutura para reportar o resultado da operação de organização."""

    lots_created: int = 0
    files_moved: int = 0
    success: bool = True
    message: str = "Operação concluída com sucesso."
