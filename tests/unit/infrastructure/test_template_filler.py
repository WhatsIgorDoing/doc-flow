import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from app.infrastructure.template_filler import OpenpyxlTemplateFiller
from app.domain.entities import DocumentGroup, DocumentFile, ManifestItem


@pytest.mark.asyncio
async def test_fill_and_save_success():
    """Testa preenchimento do template com mocks."""

    # Mock do FileSystemManager
    mock_file_manager = MagicMock()
    mock_file_manager.copy_file = AsyncMock()

    # Mock do openpyxl
    # Precisamos mockar load_workbook, o workbook retornado, a sheet, e o save.
    with (
        patch("openpyxl.load_workbook") as mock_load,
        patch("pathlib.Path.exists", return_value=True),
    ):
        mock_wb = MagicMock()
        mock_sheet = MagicMock()
        mock_wb.active = mock_sheet
        mock_load.return_value = mock_wb

        filler = OpenpyxlTemplateFiller(mock_file_manager)

        template_path = Path("template.xlsx")
        output_path = Path("output.xlsx")

        # Dados de exemplo
        item = ManifestItem("DOC-001", "A", "Title", {"Extra": "Value"})
        file = DocumentFile(Path("f.pdf"), size_bytes=10, associated_manifest_item=item)
        group = DocumentGroup("DOC-001", [file])
        data = [group]

        # Configurar comportamento da planilha fake para leitura de "FIM"
        # max_row = 1 (apenas header)
        mock_sheet.max_row = 1
        mock_sheet.cell.return_value.value = (
            None  # Não encontra FIM, insere no final/inicio
        )

        # Execução
        await filler.fill_and_save(template_path, output_path, data)

        # Verificações
        # 1. Copiou o template?
        mock_file_manager.copy_file.assert_called_with(template_path, output_path)

        # 2. Carregou o output (cópia)?
        mock_load.assert_called_with(output_path)

        # 3. Salvou o workbook?
        mock_wb.save.assert_called_with(output_path)
        mock_wb.close.assert_called_once()

        # 4. Verifica chamadas de preenchimento (insert_rows ou cell)
        # Como passamos 1 item, deve chamar insert_rows ou setar celulas
        assert mock_sheet.insert_rows.called or mock_sheet.cell.called
