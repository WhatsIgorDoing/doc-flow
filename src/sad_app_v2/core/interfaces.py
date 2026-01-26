from pathlib import Path
from typing import List, Optional, Protocol

# Importamos nossas entidades de domínio para usá-las nas assinaturas
from .domain import (
    DocumentFile,
    DocumentGroup,
    ManifestItem,
    OutputLot,
)


# Definimos exceções personalizadas que o Core espera que a Infraestrutura lance
class CoreError(Exception):
    """Classe base para exceções da aplicação."""

    pass


class ManifestReadError(CoreError):
    """Erro ao ler ou processar o manifesto."""

    ...


class SourceDirectoryNotFoundError(CoreError):
    """Erro quando o diretório de origem não é encontrado."""

    ...


class FileReadError(CoreError):
    """Erro ao ler o conteúdo de um arquivo."""

    ...


class TemplateNotFoundError(CoreError):
    """Erro quando o template não é encontrado."""

    ...


class TemplateFillError(CoreError):
    """Erro ao preencher o template."""

    ...


class FileSystemOperationError(CoreError):
    """Erro em operações do sistema de arquivos."""

    ...


class IManifestRepository(Protocol):
    """Contrato para um repositório que lê dados de um manifesto."""

    def load_from_file(self, file_path: Path) -> List[ManifestItem]:
        """Carrega dados de um arquivo e os transforma em entidades ManifestItem."""
        ...


class IFileRepository(Protocol):
    """Contrato para um repositório que lista arquivos em um diretório."""

    def list_files(self, directory: Path) -> List[DocumentFile]:
        """Escaneia um diretório e retorna entidades DocumentFile."""
        ...


class IContentExtractor(Protocol):
    """Contrato para um serviço que extrai conteúdo textual de um arquivo."""

    def extract_text(self, file: DocumentFile, profile_id: str) -> str:
        """Extrai texto de um arquivo usando uma estratégia de perfil."""
        ...


class ICodeExtractor(Protocol):
    """Contrato para um serviço que encontra um código de relatório em um texto."""

    def find_code(self, text: str, profile_id: str) -> Optional[str]:
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

    def create_directory(self, path: Path) -> None:
        """Cria um diretório no caminho especificado."""
        ...

    def move_file(self, source: Path, destination: Path) -> None:
        """Move um arquivo do local de origem para o destino."""
        ...

    def copy_file(self, source: Path, destination: Path) -> None:
        """Copia um arquivo do local de origem para o destino."""
        ...


class ITemplateFiller(Protocol):
    """Contrato para um serviço que preenche um template Excel."""

    def fill_and_save(
        self,
        template_path: Path,
        output_path: Path,
        # Alterado para receber DocumentGroup, que contém toda a informação
        data: List["DocumentGroup"],
    ) -> None:
        """Abre um template, preenche com dados e o salva em um novo local."""
        ...


# Exceções específicas para o caso de uso de resolução
class ExtractionFailedError(CoreError):
    """Erro quando a extração de código falha."""

    ...


class CodeNotInManifestError(CoreError):
    """Erro quando o código extraído não existe no manifesto."""

    ...
