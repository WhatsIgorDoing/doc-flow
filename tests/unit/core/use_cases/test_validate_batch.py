import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

from app.domain.entities import DocumentFile, DocumentStatus, ManifestItem
from app.use_cases.validate_batch import ValidateBatchUseCase


@pytest.mark.asyncio
async def test_validate_batch_happy_path():
    """
    Testa o caminho feliz: alguns arquivos correspondem, outros não.
    """
    # 1. Setup: Criar dados de teste e Mocks (dublês)
    # -- Dados do Manifesto Falso
    manifest_item1 = ManifestItem("DOC-001", "A", "Documento 1")
    manifest_item2 = ManifestItem("DOC-002", "0", "Documento 2")

    # -- Arquivos Falsos no Disco
    # Este deve corresponder ao DOC-001
    file1 = DocumentFile(path=Path("C:/fake/DOC-001_A.pdf"), size_bytes=100)
    # Este também deve corresponder ao DOC-001
    file2 = DocumentFile(path=Path("C:/fake/DOC-001_B.dwg"), size_bytes=200)
    # Este não tem correspondência no manifesto
    file3 = DocumentFile(path=Path("C:/fake/DOC-999_A.pdf"), size_bytes=300)

    # -- Criar Mocks dos Repositórios
    mock_manifest_repo = MagicMock()
    # Usar AsyncMock ou return_value futuro para métodos async
    mock_manifest_repo.load_from_file = AsyncMock(
        return_value=[manifest_item1, manifest_item2]
    )

    mock_file_repo = MagicMock()
    mock_file_repo.list_files = AsyncMock(return_value=[file1, file2, file3])

    # 2. Execução: Instanciar e executar o caso de uso com os mocks
    use_case = ValidateBatchUseCase(
        manifest_repo=mock_manifest_repo, file_repo=mock_file_repo
    )

    # O novo use case retorna um objeto ValidationResult, não uma tupla
    result = await use_case.execute(
        manifest_path=Path("C:/fake/manifest.xlsx"), source_directory=Path("C:/fake/")
    )

    # 3. Verificação (Asserts)
    validated = result.validated_files
    unrecognized = result.unrecognized_files

    assert len(validated) == 2
    assert len(unrecognized) == 1
    assert result.success is True

    # Verifica se o status do arquivo não reconhecido está correto
    assert unrecognized[0].status == DocumentStatus.UNRECOGNIZED
    assert unrecognized[0].path.name == "DOC-999_A.pdf"

    # Verifica se os arquivos validados foram corretamente associados
    assert validated[0].status == DocumentStatus.VALIDATED
    assert validated[0].associated_manifest_item.document_code == "DOC-001"
    assert validated[1].status == DocumentStatus.VALIDATED
    assert validated[1].associated_manifest_item.document_code == "DOC-001"


@pytest.mark.asyncio
async def test_validate_batch_all_files_match():
    """
    Testa o cenário onde todos os arquivos têm correspondência no manifesto.
    """
    # Setup
    manifest_item1 = ManifestItem("DOC-001", "A", "Documento 1")
    manifest_item2 = ManifestItem("DOC-002", "B", "Documento 2")

    file1 = DocumentFile(path=Path("C:/fake/DOC-001_A.pdf"), size_bytes=100)
    file2 = DocumentFile(path=Path("C:/fake/DOC-002_B.docx"), size_bytes=200)

    mock_manifest_repo = MagicMock()
    mock_manifest_repo.load_from_file = AsyncMock(
        return_value=[manifest_item1, manifest_item2]
    )

    mock_file_repo = MagicMock()
    mock_file_repo.list_files = AsyncMock(return_value=[file1, file2])

    # Execução
    use_case = ValidateBatchUseCase(
        manifest_repo=mock_manifest_repo, file_repo=mock_file_repo
    )
    result = await use_case.execute(
        manifest_path=Path("C:/fake/manifest.xlsx"), source_directory=Path("C:/fake/")
    )

    # Verificação
    assert len(result.validated_files) == 2
    assert len(result.unrecognized_files) == 0
    assert result.success is True


@pytest.mark.asyncio
async def test_validate_batch_no_files_match():
    """
    Testa o cenário onde nenhum arquivo tem correspondência no manifesto.
    """
    # Setup
    manifest_item1 = ManifestItem("DOC-001", "A", "Documento 1")
    manifest_item2 = ManifestItem("DOC-002", "B", "Documento 2")

    file1 = DocumentFile(path=Path("C:/fake/DOC-999_A.pdf"), size_bytes=100)
    file2 = DocumentFile(path=Path("C:/fake/DOC-888_B.docx"), size_bytes=200)

    mock_manifest_repo = MagicMock()
    mock_manifest_repo.load_from_file = AsyncMock(
        return_value=[manifest_item1, manifest_item2]
    )

    mock_file_repo = MagicMock()
    mock_file_repo.list_files = AsyncMock(return_value=[file1, file2])

    # Execução
    use_case = ValidateBatchUseCase(
        manifest_repo=mock_manifest_repo, file_repo=mock_file_repo
    )
    result = await use_case.execute(
        manifest_path=Path("C:/fake/manifest.xlsx"), source_directory=Path("C:/fake/")
    )

    # Verificação
    assert len(result.validated_files) == 0
    assert len(result.unrecognized_files) == 2
    assert all(
        file.status == DocumentStatus.UNRECOGNIZED for file in result.unrecognized_files
    )


@pytest.mark.parametrize(
    "file_name, expected_base_name",
    [
        # Pattern: _[A-Z]$
        ("DOC-001_A.pdf", "DOC-001"),
        ("DOC-001_B.dwg", "DOC-001"),
        ("DOC_C.pdf", "DOC"),
        # Pattern: _Rev\d+$
        ("DOC-001_Rev0.pdf", "DOC-001"),
        ("DOC-001_Rev1.pdf", "DOC-001"),
        ("DOC-001_Rev10.pdf", "DOC-001"),
        # Pattern: _rev\d+$
        ("DOC-001_rev0.pdf", "DOC-001"),
        ("DOC-001_rev01.pdf", "DOC-001"),
        # Pattern: _\d+$
        ("DOC-001_0.pdf", "DOC-001"),
        ("DOC-001_1.pdf", "DOC-001"),
        ("DOC-001_123.pdf", "DOC-001"),
        # Specific keywords
        ("DOC-001_final.pdf", "DOC-001"),
        ("DOC-001_temp.pdf", "DOC-001"),
        ("DOC-001_old.pdf", "DOC-001"),
        ("DOC-001_backup.pdf", "DOC-001"),
        ("DOC-001_draft.pdf", "DOC-001"),
        ("DOC-001_preliminary.pdf", "DOC-001"),
        # Case Insensitive Check (implied by regex flags but good to verify if keywords are case sensitive in regex)
        # The code uses re.IGNORECASE so these should work
        ("DOC-001_FINAL.pdf", "DOC-001"),
        ("DOC-001_TEMP.pdf", "DOC-001"),
        # Files without suffixes
        ("DOC-001.pdf", "DOC-001"),
        ("DOC-002.dwg", "DOC-002"),
        # Files with underscores but no valid suffix at the end
        ("COMPLEX_DOC_NAME.pdf", "COMPLEX_DOC_NAME"),
        ("DOC_WITH_UNDERSCORES.pdf", "DOC_WITH_UNDERSCORES"),
        # Suffix-like patterns in the middle (should NOT be removed)
        ("DOC_A_REPORT.pdf", "DOC_A_REPORT"),
        ("DOC_Rev1_Part2.pdf", "DOC_Rev1_Part2"),
        ("DOC_final_version.pdf", "DOC_final_version"),
        # Edge cases
        ("A.pdf", "A"),  # Too short to have suffix? No, "A" is base name.
        # Wait, if file is "A_B.pdf" -> "A"
        ("A_B.pdf", "A"),
    ],
)
def test_get_file_base_name_regex_patterns(file_name, expected_base_name):
    """
    Testa a função de extração do nome base do arquivo com vários padrões de regex.
    Cobre todos os casos definidos em ValidateBatchUseCase._get_file_base_name.
    """
    use_case = ValidateBatchUseCase(manifest_repo=MagicMock(), file_repo=MagicMock())
    assert use_case._get_file_base_name(file_name) == expected_base_name
