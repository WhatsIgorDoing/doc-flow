import pytest
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from app.domain.entities import DocumentFile, DocumentGroup, ManifestItem, OutputLot
from app.use_cases.organize_lots import OrganizeLotsUseCase


@pytest.mark.asyncio
async def test_organize_lots_success():
    """
    Testa o fluxo de sucesso da organização de lotes.
    Declara um lote de saída com 1 grupo contendo 1 arquivo.
    Verifica se o gerenciador de arquivos e o preenchimento de template são chamados corretamente.
    """
    # 1. Setup
    # Criar dados de entrada (arquivos validados)
    manifest_item = ManifestItem("DOC-001", "0", "Documento 1")
    validated_file = DocumentFile(
        path=Path("C:/source/DOC-001.pdf"),
        size_bytes=1024,
        associated_manifest_item=manifest_item,
    )
    validated_files = [validated_file]

    # Criar mocks para dependências
    # - Balancer (síncrono)
    mock_balancer = MagicMock()
    # O balancer deve retornar uma lista de OutputLot
    group = DocumentGroup(document_code="DOC-001", files=[validated_file])
    output_lot = OutputLot(lot_name="LOT_0001", groups=[group])
    mock_balancer.balance_lots.return_value = [output_lot]

    # - FileSystemManager (async)
    mock_file_manager = MagicMock()
    mock_file_manager.create_directory = AsyncMock()
    mock_file_manager.move_file = AsyncMock()

    # - TemplateFiller (async)
    mock_template_filler = MagicMock()
    mock_template_filler.fill_and_save = AsyncMock()

    # Instanciar caso de uso
    use_case = OrganizeLotsUseCase(
        balancer=mock_balancer,
        file_manager=mock_file_manager,
        template_filler=mock_template_filler,
    )

    # 2. Execução
    output_dir = Path("C:/output")
    template_path = Path("C:/templates/master.xlsx")

    result = await use_case.execute(
        validated_files=validated_files,
        output_directory=output_dir,
        master_template_path=template_path,
        max_docs_per_lot=100,
        start_sequence_number=1,
        lot_name_pattern="LOT_XXXX",
    )

    # 3. Verificação
    assert result.success is True
    assert result.lots_created == 1
    assert result.files_moved == 1

    # Verificar chamadas ao FileSystemManager
    # - Deve ter criado o diretório do lote "LOT_0001"
    expected_lot_dir = output_dir / "LOT_0001"
    mock_file_manager.create_directory.assert_called_with(expected_lot_dir)

    # - Deve ter movido o arquivo DOC-001.pdf para o diretório do lote
    # O nome seria o mesmo pois a revisão é "0" e não temos sufixo conflitante
    # Ou se a lógica de get_filename_with_revision adicionar _0, verificamos isso.
    # Assumindo que a lógica adiciona _rev se não existir.
    expected_dest_path = expected_lot_dir / "DOC-001_0.pdf"
    mock_file_manager.move_file.assert_called_with(
        validated_file.path, expected_dest_path
    )

    # Verificar chamadas ao TemplateFiller
    expected_manifest_path = expected_lot_dir / "LOT_0001.xlsx"
    mock_template_filler.fill_and_save.assert_called_once()

    # args: template_path, output_path, groups
    call_args = mock_template_filler.fill_and_save.call_args
    assert call_args[0][0] == template_path
    assert call_args[0][1] == expected_manifest_path
    assert call_args[0][2] == [group]


@pytest.mark.asyncio
async def test_organize_lots_file_move_error():
    """
    Testa o comportamento quando ocorre erro ao mover arquivo.
    O caso de uso deve capturar a exceção e retornar sucesso=False.
    """
    # Setup
    manifest_item = ManifestItem("DOC-001", "0", "Documento 1")
    validated_file = DocumentFile(
        path=Path("C:/source/DOC-001.pdf"),
        size_bytes=1024,
        associated_manifest_item=manifest_item,
    )

    mock_balancer = MagicMock()
    group = DocumentGroup(document_code="DOC-001", files=[validated_file])
    mock_balancer.balance_lots.return_value = [
        OutputLot(lot_name="LOT_0001", groups=[group])
    ]

    mock_file_manager = MagicMock()
    mock_file_manager.create_directory = AsyncMock()
    # Simular erro ao mover arquivo
    mock_file_manager.move_file = AsyncMock(side_effect=Exception("Disk full"))

    mock_template_filler = MagicMock()

    use_case = OrganizeLotsUseCase(
        balancer=mock_balancer,
        file_manager=mock_file_manager,
        template_filler=mock_template_filler,
    )

    # Execução
    result = await use_case.execute(
        validated_files=[validated_file],
        output_directory=Path("C:/output"),
        master_template_path=Path("C:/template.xlsx"),
        max_docs_per_lot=100,
        start_sequence_number=1,
        lot_name_pattern="LOT_XXXX",
    )

    # Verificação
    assert result.success is False
    assert "Erro na organização" in result.message
    assert result.files_moved == 0
