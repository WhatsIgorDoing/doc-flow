from pathlib import Path
from unittest.mock import MagicMock

from src.sad_app_v2.core.domain import DocumentFile, DocumentStatus, ManifestItem
from src.sad_app_v2.core.use_cases.validate_batch import ValidateBatchUseCase


def test_validate_batch_happy_path():
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
    mock_manifest_repo.load_from_file.return_value = [manifest_item1, manifest_item2]

    mock_file_repo = MagicMock()
    mock_file_repo.list_files.return_value = [file1, file2, file3]

    # 2. Execução: Instanciar e executar o caso de uso com os mocks
    use_case = ValidateBatchUseCase(
        manifest_repo=mock_manifest_repo, file_repo=mock_file_repo
    )
    validated, unrecognized = use_case.execute(
        manifest_path=Path("C:/fake/manifest.xlsx"), source_directory=Path("C:/fake/")
    )

    # 3. Verificação (Asserts)
    assert len(validated) == 2
    assert len(unrecognized) == 1

    # Verifica se o status do arquivo não reconhecido está correto
    assert unrecognized[0].status == DocumentStatus.UNRECOGNIZED
    assert unrecognized[0].path.name == "DOC-999_A.pdf"

    # Verifica se os arquivos validados foram corretamente associados
    assert validated[0].status == DocumentStatus.VALIDATED
    assert validated[0].associated_manifest_item.document_code == "DOC-001"
    assert validated[1].status == DocumentStatus.VALIDATED
    assert validated[1].associated_manifest_item.document_code == "DOC-001"


def test_validate_batch_all_files_match():
    """
    Testa o cenário onde todos os arquivos têm correspondência no manifesto.
    """
    # Setup
    manifest_item1 = ManifestItem("DOC-001", "A", "Documento 1")
    manifest_item2 = ManifestItem("DOC-002", "B", "Documento 2")

    file1 = DocumentFile(path=Path("C:/fake/DOC-001_A.pdf"), size_bytes=100)
    file2 = DocumentFile(path=Path("C:/fake/DOC-002_B.docx"), size_bytes=200)

    mock_manifest_repo = MagicMock()
    mock_manifest_repo.load_from_file.return_value = [manifest_item1, manifest_item2]

    mock_file_repo = MagicMock()
    mock_file_repo.list_files.return_value = [file1, file2]

    # Execução
    use_case = ValidateBatchUseCase(
        manifest_repo=mock_manifest_repo, file_repo=mock_file_repo
    )
    validated, unrecognized = use_case.execute(
        manifest_path=Path("C:/fake/manifest.xlsx"), source_directory=Path("C:/fake/")
    )

    # Verificação
    assert len(validated) == 2
    assert len(unrecognized) == 0


def test_validate_batch_no_files_match():
    """
    Testa o cenário onde nenhum arquivo tem correspondência no manifesto.
    """
    # Setup
    manifest_item1 = ManifestItem("DOC-001", "A", "Documento 1")
    manifest_item2 = ManifestItem("DOC-002", "B", "Documento 2")

    file1 = DocumentFile(path=Path("C:/fake/DOC-999_A.pdf"), size_bytes=100)
    file2 = DocumentFile(path=Path("C:/fake/DOC-888_B.docx"), size_bytes=200)

    mock_manifest_repo = MagicMock()
    mock_manifest_repo.load_from_file.return_value = [manifest_item1, manifest_item2]

    mock_file_repo = MagicMock()
    mock_file_repo.list_files.return_value = [file1, file2]

    # Execução
    use_case = ValidateBatchUseCase(
        manifest_repo=mock_manifest_repo, file_repo=mock_file_repo
    )
    validated, unrecognized = use_case.execute(
        manifest_path=Path("C:/fake/manifest.xlsx"), source_directory=Path("C:/fake/")
    )

    # Verificação
    assert len(validated) == 0
    assert len(unrecognized) == 2
    assert all(file.status == DocumentStatus.UNRECOGNIZED for file in unrecognized)


def test_get_file_base_name():
    """
    Testa a função de extração do nome base do arquivo.
    """
    use_case = ValidateBatchUseCase(manifest_repo=MagicMock(), file_repo=MagicMock())

    # Testa casos comuns
    assert use_case._get_file_base_name("DOC-001_A.pdf") == "DOC-001"
    assert use_case._get_file_base_name("DOC-002_B.dwg") == "DOC-002"
    assert use_case._get_file_base_name("REPORT-123_rev1.docx") == "REPORT-123"

    # Testa caso sem sufixo de revisão
    assert use_case._get_file_base_name("DOC-003.pdf") == "DOC-003"

    # Testa caso com múltiplos underscores
    assert use_case._get_file_base_name("COMPLEX_DOC_NAME_A.pdf") == "COMPLEX_DOC_NAME"
