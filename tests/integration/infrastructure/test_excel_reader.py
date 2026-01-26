from pathlib import Path

import pytest

from src.sad_app_v2.core.interfaces import ManifestReadError
from src.sad_app_v2.infrastructure.excel_reader import ExcelManifestRepository


def test_load_from_file_happy_path():
    """Verifica se o repositório lê o arquivo de fixture corretamente."""
    # Setup
    repo = ExcelManifestRepository()
    fixture_path = Path("tests/fixtures/manifesto_exemplo.xlsx")

    # Execução
    items = repo.load_from_file(fixture_path)

    # Verificação
    assert len(items) == 2
    assert items[0].document_code == "documento_pid"
    assert items[0].revision == "A"
    assert items[0].title == "Documento PID de Teste"
    assert items[0].metadata["DISCIPLINA"] == "PROCESSO"

    assert items[1].document_code == "documento_rir"


def test_load_from_file_not_found():
    """Verifica se a exceção correta é lançada se o arquivo não existir."""
    repo = ExcelManifestRepository()
    non_existent_path = Path("tests/fixtures/nao_existe.xlsx")

    # Verifica se a exceção ManifestReadError é lançada
    with pytest.raises(ManifestReadError):
        repo.load_from_file(non_existent_path)
