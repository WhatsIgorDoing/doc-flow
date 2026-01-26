from pathlib import Path
from unittest.mock import MagicMock

import pytest

from src.sad_app_v2.core.domain import DocumentFile, DocumentStatus, ManifestItem
from src.sad_app_v2.core.interfaces import (
    CodeNotInManifestError,
    ExtractionFailedError,
)
from src.sad_app_v2.core.use_cases.resolve_exception import (
    ResolveUnrecognizedFileUseCase,
)

# Dados de teste reutilizáveis
FAKE_FILE = DocumentFile(
    path=Path("unrecognized.pdf"),
    size_bytes=100,
    status=DocumentStatus.UNRECOGNIZED
)
MANIFEST_LIST = [
    ManifestItem("DOC-RESOLVED", "A", "Documento Resolvido"),
    ManifestItem("DOC-OTHER", "B", "Outro Documento"),
]


def test_resolve_exception_happy_path():
    """Verifica o cenário de sucesso onde o código é extraído e encontrado."""
    # Setup
    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text.return_value = (
        "Texto contendo Relatório: DOC-RESOLVED_A"
    )

    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code.return_value = "DOC-RESOLVED_A"

    use_case = ResolveUnrecognizedFileUseCase(
        mock_content_extractor, mock_code_extractor
    )

    # Execução
    resolved_file = use_case.execute(
        file_to_resolve=FAKE_FILE,
        profile_id="RIR",
        all_manifest_items=MANIFEST_LIST
    )

    # Verificação
    assert resolved_file.status == DocumentStatus.VALIDATED
    assert resolved_file.associated_manifest_item.document_code == "DOC-RESOLVED"


def test_resolve_exception_extraction_fails():
    """Verifica se a exceção correta é lançada quando o código não é encontrado."""
    # Setup
    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text.return_value = "Texto sem nenhum codigo"

    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code.return_value = None  # Simula falha na extração

    use_case = ResolveUnrecognizedFileUseCase(
        mock_content_extractor, mock_code_extractor
    )

    # Execução e Verificação
    with pytest.raises(ExtractionFailedError):
        use_case.execute(FAKE_FILE, "RIR", MANIFEST_LIST)


def test_resolve_exception_code_not_in_manifest():
    """Verifica exceção quando código é extraído mas não existe no manifesto."""
    # Setup
    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text.return_value = "Relatório: DOC-UNKNOWN"

    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code.return_value = "DOC-UNKNOWN"

    use_case = ResolveUnrecognizedFileUseCase(
        mock_content_extractor, mock_code_extractor
    )

    # Execução e Verificação
    with pytest.raises(CodeNotInManifestError):
        use_case.execute(FAKE_FILE, "RIR", MANIFEST_LIST)
