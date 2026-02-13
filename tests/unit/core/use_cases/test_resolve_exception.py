from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.interfaces import CodeNotInManifestError, ExtractionFailedError
from app.domain.entities import DocumentFile, DocumentStatus, ManifestItem
from app.use_cases.resolve_exception import ResolveExceptionUseCase


def _make_use_case(content_extractor, code_extractor, file_manager=None):
    """Helper to create use case with optional file_manager mock."""
    if file_manager is None:
        file_manager = MagicMock()
        file_manager.rename_file = AsyncMock(
            side_effect=lambda source, new_name: source.parent / new_name
        )
    return ResolveExceptionUseCase(
        content_extractor=content_extractor,
        code_extractor=code_extractor,
        file_manager=file_manager,
    )


@pytest.mark.asyncio
async def test_resolve_success():
    """Testa recuperação de arquivo com sucesso, incluindo renomeação física."""
    # Setup
    manifest_item = ManifestItem("DOC-123", "0", "Documento Exemplo")
    file_to_resolve = DocumentFile(path=Path("strange_name.pdf"), size_bytes=0)

    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text = AsyncMock(
        return_value="Conteúdo com DOC-123 no meio"
    )

    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code = AsyncMock(return_value="DOC-123")

    mock_file_manager = MagicMock()
    mock_file_manager.rename_file = AsyncMock(return_value=Path("DOC-123_0.pdf"))

    use_case = _make_use_case(
        mock_content_extractor, mock_code_extractor, mock_file_manager
    )

    # Execução
    resolved_file = await use_case.execute(
        file_to_resolve=file_to_resolve,
        profile_id="GENERIC",
        all_manifest_items=[manifest_item],
    )

    # Verificação
    assert resolved_file.status == DocumentStatus.VALIDATED
    assert resolved_file.associated_manifest_item.document_code == "DOC-123"
    assert resolved_file.path == Path("DOC-123_0.pdf")

    # Verificar que rename_file foi chamado
    mock_file_manager.rename_file.assert_awaited_once_with(
        Path("strange_name.pdf"), "DOC-123_0.pdf"
    )


@pytest.mark.asyncio
async def test_resolve_extraction_failed():
    """Testa falha quando nenhum código é encontrado."""
    file_to_resolve = DocumentFile(path=Path("empty.pdf"), size_bytes=0)

    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text = AsyncMock(return_value="Texto sem código")

    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code = AsyncMock(return_value=None)

    use_case = _make_use_case(mock_content_extractor, mock_code_extractor)

    with pytest.raises(ExtractionFailedError):
        await use_case.execute(
            file_to_resolve=file_to_resolve, profile_id="GENERIC", all_manifest_items=[]
        )


@pytest.mark.asyncio
async def test_resolve_code_not_in_manifest():
    """Testa falha quando código é encontrado mas não está no manifesto."""
    file_to_resolve = DocumentFile(path=Path("unknown.pdf"), size_bytes=0)

    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text = AsyncMock(return_value="DOC-999")

    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code = AsyncMock(return_value="DOC-999")

    use_case = _make_use_case(mock_content_extractor, mock_code_extractor)

    # Manifesto vazio, então DOC-999 não será encontrado
    with pytest.raises(CodeNotInManifestError):
        await use_case.execute(
            file_to_resolve=file_to_resolve, profile_id="GENERIC", all_manifest_items=[]
        )


@pytest.mark.asyncio
async def test_resolve_renames_file_with_correct_name():
    """Testa que a renomeação usa document_code + revision + extensão original."""
    manifest_item = ManifestItem("ELE-700-CHZ-247", "A", "Diagrama Elétrico")
    file_to_resolve = DocumentFile(path=Path("/docs/wrong_name.pdf"), size_bytes=1024)

    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text = AsyncMock(
        return_value="ELE-700-CHZ-247 texto"
    )

    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code = AsyncMock(return_value="ELE-700-CHZ-247")

    mock_file_manager = MagicMock()
    expected_path = Path("/docs/ELE-700-CHZ-247_A.pdf")
    mock_file_manager.rename_file = AsyncMock(return_value=expected_path)

    use_case = _make_use_case(
        mock_content_extractor, mock_code_extractor, mock_file_manager
    )

    resolved = await use_case.execute(
        file_to_resolve=file_to_resolve,
        profile_id="RIR",
        all_manifest_items=[manifest_item],
    )

    assert resolved.path == expected_path
    mock_file_manager.rename_file.assert_awaited_once_with(
        Path("/docs/wrong_name.pdf"), "ELE-700-CHZ-247_A.pdf"
    )
