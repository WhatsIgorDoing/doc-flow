"""
Exceções customizadas para o SAD App v2.
Hierarquia de erros seguindo padrão Clean Architecture.
"""


class SADError(Exception):
    """Classe base para todas as exceções da aplicação."""

    pass


class DomainError(SADError):
    """Erros relacionados a regras de negócio."""

    pass


class InfrastructureError(SADError):
    """Erros relacionados a operações de infraestrutura."""

    pass


# === Exceções de Manifesto ===


class ManifestError(InfrastructureError):
    """Erro ao processar manifesto."""

    pass


class ManifestReadError(ManifestError):
    """Erro ao ler arquivo de manifesto."""

    pass


class ManifestParseError(ManifestError):
    """Erro ao parsear dados do manifesto."""

    pass


# === Exceções de Sistema de Arquivos ===


class FileSystemError(InfrastructureError):
    """Erro em operações do sistema de arquivos."""

    pass


class SourceDirectoryNotFoundError(FileSystemError):
    """Diretório de origem não encontrado."""

    pass


class FileReadError(FileSystemError):
    """Erro ao ler arquivo."""

    pass


class FileWriteError(FileSystemError):
    """Erro ao escrever arquivo."""

    pass


class FileOperationError(FileSystemError):
    """Erro em operação de arquivo (mover, copiar, etc)."""

    pass


class FileConflictError(FileSystemError):
    """Erro quando o destino já existe e não pode ser sobrescrito."""

    pass


# === Exceções de Template ===


class TemplateError(InfrastructureError):
    """Erro relacionado a templates."""

    pass


class TemplateNotFoundError(TemplateError):
    """Template não encontrado."""

    pass


class TemplateFillError(TemplateError):
    """Erro ao preencher template."""

    pass


# === Exceções de Validação ===


class ValidationError(DomainError):
    """Erro durante validação de documentos."""

    pass


# === Exceções de Organização ===


class OrganizationError(DomainError):
    """Erro durante organização de lotes."""

    pass


# === Exceções de Resolução de Arquivo ===


class ResolutionError(DomainError):
    """Erro durante resolução de arquivos não reconhecidos."""

    pass


class ExtractionFailedError(ResolutionError):
    """Erro quando a extração de código falha."""

    pass


class CodeNotInManifestError(ResolutionError):
    """Erro quando o código extraído não existe no manifesto."""

    pass
