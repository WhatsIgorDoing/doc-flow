import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

from app.domain.entities import DocumentFile, DocumentStatus, ManifestItem
from app.use_cases.resolve_exception import ResolveExceptionUseCase
from app.core.interfaces import CodeNotInManifestError, ExtractionFailedError

@pytest.mark.asyncio
async def test_resolve_success():
    """Testa recuperação de arquivo com sucesso."""
    # Setup
    manifest_item = ManifestItem("DOC-123", "0", "Documento Exemplo")
    file_to_resolve = DocumentFile(path=Path("strange_name.pdf"), size_bytes=0)
    
    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text = AsyncMock(return_value="Conteúdo com DOC-123 no meio")
    
    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code = AsyncMock(return_value="DOC-123")

    use_case = ResolveExceptionUseCase(
        content_extractor=mock_content_extractor,
        code_extractor=mock_code_extractor
    )

    # Execução
    resolved_file = await use_case.execute(
        file_to_resolve=file_to_resolve,
        profile_id="GENERIC",
        all_manifest_items=[manifest_item]
    )

    # Verificação
    assert resolved_file.status == DocumentStatus.VALIDATED
    assert resolved_file.associated_manifest_item.document_code == "DOC-123"

@pytest.mark.asyncio
async def test_resolve_extraction_failed():
    """Testa falha quando nenhum código é encontrado."""
    file_to_resolve = DocumentFile(path=Path("empty.pdf"), size_bytes=0)
    
    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text = AsyncMock(return_value="Texto sem código")
    
    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code = AsyncMock(return_value=None)

    use_case = ResolveExceptionUseCase(
        content_extractor=mock_content_extractor,
        code_extractor=mock_code_extractor
    )

    with pytest.raises(ExtractionFailedError):
        await use_case.execute(
            file_to_resolve=file_to_resolve,
            profile_id="GENERIC",
            all_manifest_items=[]
        )

@pytest.mark.asyncio
async def test_resolve_code_not_in_manifest():
    """Testa falha quando código é encontrado mas não está no manifesto."""
    file_to_resolve = DocumentFile(path=Path("unknown.pdf"), size_bytes=0)
    
    mock_content_extractor = MagicMock()
    mock_content_extractor.extract_text = AsyncMock(return_value="DOC-999")
    
    mock_code_extractor = MagicMock()
    mock_code_extractor.find_code = AsyncMock(return_value="DOC-999")

    use_case = ResolveExceptionUseCase(
        content_extractor=mock_content_extractor,
        code_extractor=mock_code_extractor
    )

    # Manifesto vazio, então DOC-999 não será encontrado
    with pytest.raises(CodeNotInManifestError):
        await use_case.execute(
            file_to_resolve=file_to_resolve,
            profile_id="GENERIC",
            all_manifest_items=[]
        )
