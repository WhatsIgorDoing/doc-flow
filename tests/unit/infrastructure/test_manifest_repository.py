from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from app.domain.exceptions import ManifestParseError, ManifestReadError
from app.infrastructure.repositories import ManifestRepository


@pytest.fixture
def mock_openpyxl_load():
    with patch("openpyxl.load_workbook") as mock_load:
        yield mock_load


@pytest.mark.asyncio
async def test_load_from_file_success(mock_openpyxl_load):
    """Testa carregamento bem-sucedido do manifesto Excel."""
    # Setup - Configurar Workbook Mock
    mock_wb = MagicMock()
    mock_sheet = MagicMock()
    mock_wb.active = mock_sheet
    mock_openpyxl_load.return_value = mock_wb

    # Configurar linhas do Excel (Header + 1 Linha de dados)
    # Row 1: Header
    # Row 2: Dados (Code, Rev, Title, Metadata...)

    # Mockando acesso via iter_rows (usado no codigo: min_row=2, values_only=True)
    # Retorna uma lista de tuplas (row data)
    # O código chama iter_rows 3 vezes:
    # 1. Scanner de header (max_row=20)
    # 2. Ler header cells (values_only=True)
    # 3. Ler dados (min_row=header_row+1)

    header_row = ("Document Code", "Revision", "Title", "Extra Column")
    data_row = ("DOC-001", "A", "Titulo Doc 1", "Extra Valor")

    mock_sheet.iter_rows.side_effect = [
        [header_row, data_row], # 1. Scan (encontra header na row 1)
        [header_row],           # 2. Get Header Names
        [data_row]              # 3. Get Data
    ]

    # Mockando acesso via index (usado no codigo: sheet[1] para header)
    # sheet[1] retorna uma lista de Cells
    mock_cell1 = MagicMock()
    mock_cell1.value = "Document Code"
    mock_cell2 = MagicMock()
    mock_cell2.value = "Revision"
    mock_cell3 = MagicMock()
    mock_cell3.value = "Title"
    mock_cell4 = MagicMock()
    mock_cell4.value = "Extra Column"

    mock_sheet.__getitem__.return_value = [
        mock_cell1,
        mock_cell2,
        mock_cell3,
        mock_cell4,
    ]

    repo = ManifestRepository()
    file_path = Path("fake_manifest.xlsx")

    # Tem que existir o arquivo na checagem path.exists()
    # Como não usamos IO real de disco para leitura, podemos mockar exists
    with patch("pathlib.Path.exists", return_value=True):
        items = await repo.load_from_file(file_path)

    assert len(items) == 1
    assert items[0].document_code == "DOC-001"
    assert items[0].revision == "A"
    assert items[0].title == "Titulo Doc 1"
    assert items[0].metadata["Extra Column"] == "Extra Valor"

    mock_wb.close.assert_called_once()


@pytest.mark.asyncio
async def test_load_from_file_not_found():
    """Testa erro quando arquivo não existe."""
    repo = ManifestRepository()
    file_path = Path("non_existent.xlsx")

    with patch("pathlib.Path.exists", return_value=False):
        with pytest.raises(ManifestReadError) as exc:
            await repo.load_from_file(file_path)

    assert "Manifest file not found" in str(exc.value)


@pytest.mark.asyncio
async def test_load_from_file_parse_error(mock_openpyxl_load):
    """Testa erro de parsing quando openpyxl falha."""
    mock_openpyxl_load.side_effect = Exception("Corrupted file")

    repo = ManifestRepository()
    file_path = Path("corrupted.xlsx")

    with patch("pathlib.Path.exists", return_value=True):
        with pytest.raises(ManifestParseError) as exc:
            await repo.load_from_file(file_path)

    assert "Error parsing manifest" in str(exc.value)
