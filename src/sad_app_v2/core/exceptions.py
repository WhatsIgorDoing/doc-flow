

class CoreError(Exception):
    """Exceção base para todos os erros do domínio."""

    pass


class ValidationError(CoreError):
    """Exceção para erros de validação de documentos."""

    pass


class ExtractionError(CoreError):
    """Exceção para erros durante extração de metadados."""

    pass


class FileSystemError(CoreError):
    """Exceção para erros do sistema de arquivos."""

    pass


class TemplateFillError(CoreError):
    """Exceção para erros durante preenchimento de templates."""

    pass


class LotBalancingError(CoreError):
    """Exceção para erros durante balanceamento de lotes."""

    pass
