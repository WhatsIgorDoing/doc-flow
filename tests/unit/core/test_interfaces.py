def test_interfaces_import():
    """
    Verifica se todas as interfaces podem ser importadas sem erro.
    """
    from src.sad_app_v2.core.interfaces import (
        CoreError,  # noqa: F401
        FileReadError,  # noqa: F401
        FileSystemOperationError,  # noqa: F401
        ICodeExtractor,  # noqa: F401
        IContentExtractor,  # noqa: F401
        IFileRepository,  # noqa: F401
        IFileSystemManager,  # noqa: F401
        ILotBalancerService,  # noqa: F401
        IManifestRepository,  # noqa: F401
        ITemplateFiller,  # noqa: F401
        ManifestReadError,  # noqa: F401
        SourceDirectoryNotFoundError,  # noqa: F401
        TemplateFillError,  # noqa: F401
        TemplateNotFoundError,  # noqa: F401
    )

    assert True


def test_core_error_hierarchy():
    """
    Verifica se a hierarquia de exceções está correta.
    """
    from src.sad_app_v2.core.interfaces import CoreError, ManifestReadError

    # Verifica se ManifestReadError é subclasse de CoreError
    assert issubclass(ManifestReadError, CoreError)

    # Verifica se podemos instanciar as exceções
    base_error = CoreError("Erro base")
    specific_error = ManifestReadError("Erro específico")

    assert str(base_error) == "Erro base"
    assert str(specific_error) == "Erro específico"
