from pathlib import Path
from typing import List, Optional, Protocol

from app.domain.entities import (
    DocumentFile,
    DocumentGroup,
    ManifestItem,
    OutputLot,
)
from app.domain.exceptions import (
    CodeNotInManifestError,
    ExtractionFailedError,
    FileOperationError,
    FileReadError,
    ManifestReadError,
    SourceDirectoryNotFoundError,
    TemplateFillError,
    TemplateNotFoundError,
)


# ===== Interfaces (Protocols) =====

class IManifestRepository(Protocol):
    """Contrato para um repositório que lê dados de um manifesto."""

    async def load_from_file(self, file_path: Path) -> List[ManifestItem]:
        """Carrega dados de um arquivo e os transforma em entidades ManifestItem."""
        ...


class IFileRepository(Protocol):
    """Contrato para um repositório que lista arquivos em um diretório."""

    async def list_files(self, directory: Path) -> List[DocumentFile]:
        """Escaneia um diretório e retorna entidades DocumentFile."""
        ...


class IContentExtractor(Protocol):
    """Contrato para um serviço que extrai conteúdo textual de um arquivo."""

    async def extract_text(self, file: DocumentFile, profile_id: str) -> str:
        """Extrai texto de um arquivo usando uma estratégia de perfil."""
        ...


class ICodeExtractor(Protocol):
    """Contrato para um serviço que encontra um código de relatório em um texto."""

    async def find_code(self, text: str, profile_id: str) -> Optional[str]:
        """Aplica padrões de um perfil para encontrar um código em um texto."""
        ...


class ILotBalancerService(Protocol):
    """Contrato para o serviço de lógica de negócio de balanceamento de lotes."""

    def balance_lots(
        self, groups: List[DocumentGroup], max_docs_per_lot: int
    ) -> List[OutputLot]:
        """Distribui grupos de documentos em lotes de forma balanceada."""
        ...


class IFileSystemManager(Protocol):
    """Contrato para um gerenciador de operações do sistema de arquivos."""

    async def create_directory(self, path: Path) -> None:
        """Cria um diretório no caminho especificado."""
        ...

    async def move_file(self, source: Path, destination: Path) -> None:
        """Move um arquivo do local de origem para o destino."""
        ...

    async def copy_file(self, source: Path, destination: Path) -> None:
        """Copia um arquivo do local de origem para o destino."""
        ...

    async def rename_file(self, source: Path, new_name: str) -> Path:
        """Renomeia arquivo de forma segura, resolvendo conflitos de nome."""
        ...


class ITemplateFiller(Protocol):
    """Contrato para um serviço que preenche um template Excel."""

    async def fill_and_save(
        self,
        template_path: Path,
        output_path: Path,
        data: List[DocumentGroup],
    ) -> None:
        """Abre um template, preenche com dados e o salva em um novo local."""
        ...
