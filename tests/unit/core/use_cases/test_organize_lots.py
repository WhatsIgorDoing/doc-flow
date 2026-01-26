from pathlib import Path
from unittest.mock import MagicMock, call

from src.sad_app_v2.core.domain import (
    DocumentFile,
    DocumentGroup,
    ManifestItem,
    OutputLot,
)
from src.sad_app_v2.core.use_cases.organize_lots import OrganizeAndGenerateLotsUseCase


def test_organize_lots_happy_path():
    """
    Testa o fluxo completo de organização, verificando se os serviços
    de infraestrutura são chamados corretamente.
    """
    # 1. Setup (Arrange)
    # -- Dados de teste
    m1 = ManifestItem("DOC-A", "1", "Doc A")
    m2 = ManifestItem("DOC-B", "2", "Doc B")
    f1 = DocumentFile(Path("orig/f1.pdf"), 100, associated_manifest_item=m1)
    f2 = DocumentFile(Path("orig/f2.pdf"), 200, associated_manifest_item=m2)
    validated_files = [f1, f2]

    # -- Configuração da organização
    config = {
        "output_directory": Path("C:/destino"),
        "master_template_path": Path("C:/templates/master.xlsx"),
        "max_docs_per_lot": 1,
        "start_sequence_number": 1,
        "lot_name_pattern": "LOTE-XXXX-TESTE",
    }

    # -- Mocks dos serviços
    mock_balancer = MagicMock()
    mock_file_manager = MagicMock()
    mock_template_filler = MagicMock()

    # -- Configurar o retorno do Balancer (o mais importante)
    # O balancer dirá para criar 2 lotes, cada um com um documento.
    group_a = DocumentGroup(document_code="DOC-A", files=[f1])
    group_b = DocumentGroup(document_code="DOC-B", files=[f2])
    mock_balancer.balance_lots.return_value = [
        OutputLot(lot_name="temp1", groups=[group_a]),
        OutputLot(lot_name="temp2", groups=[group_b]),
    ]

    # 2. Execução (Act)
    use_case = OrganizeAndGenerateLotsUseCase(
        balancer=mock_balancer,
        file_manager=mock_file_manager,
        template_filler=mock_template_filler,
    )
    result = use_case.execute(validated_files, **config)

    # 3. Verificação (Assert)
    # -- O resultado está correto?
    assert result.success is True
    assert result.lots_created == 2
    assert result.files_moved == 2

    # -- O balancer foi chamado corretamente?
    mock_balancer.balance_lots.assert_called_once()

    # -- O file manager criou os diretórios corretos?
    expected_dir1_path = Path("C:/destino/LOTE-0001-TESTE")
    expected_dir2_path = Path("C:/destino/LOTE-0002-TESTE")
    mock_file_manager.create_directory.assert_has_calls(
        [
            call(expected_dir1_path),
            call(expected_dir2_path),
        ]
    )

    # -- O file manager moveu os arquivos corretos?
    # Os arquivos são renomeados com a revisão antes da extensão
    mock_file_manager.move_file.assert_has_calls(
        [
            call(Path("orig/f1.pdf"), expected_dir1_path / "f1_1.pdf"),
            call(Path("orig/f2.pdf"), expected_dir2_path / "f2_2.pdf"),
        ],
        any_order=True,
    )

    # -- O preenchedor de template foi chamado corretamente?
    expected_template1_path = expected_dir1_path / "LOTE-0001-TESTE.xlsx"
    expected_template2_path = expected_dir2_path / "LOTE-0002-TESTE.xlsx"
    mock_template_filler.fill_and_save.assert_has_calls(
        [
            call(config["master_template_path"], expected_template1_path, [group_a]),
            call(config["master_template_path"], expected_template2_path, [group_b]),
        ],
        any_order=True,
    )


def test_organize_lots_handles_errors():
    """
    Verifica se o caso de uso trata erros adequadamente.
    """
    # Setup
    from src.sad_app_v2.core.interfaces import FileSystemOperationError

    m1 = ManifestItem("DOC-A", "1", "Doc A")
    f1 = DocumentFile(Path("orig/f1.pdf"), 100, associated_manifest_item=m1)
    validated_files = [f1]

    config = {
        "output_directory": Path("C:/destino"),
        "master_template_path": Path("C:/templates/master.xlsx"),
        "max_docs_per_lot": 1,
        "start_sequence_number": 1,
        "lot_name_pattern": "LOTE-XXXX-TESTE",
    }

    # Mocks
    mock_balancer = MagicMock()
    mock_file_manager = MagicMock()
    mock_template_filler = MagicMock()

    # Configurar o balancer para retornar um lote
    group_a = DocumentGroup(document_code="DOC-A", files=[f1])
    mock_balancer.balance_lots.return_value = [
        OutputLot(lot_name="temp1", groups=[group_a])
    ]

    # Configurar o file_manager para lançar erro
    mock_file_manager.create_directory.side_effect = FileSystemOperationError(
        "Erro de teste"
    )

    # Execução
    use_case = OrganizeAndGenerateLotsUseCase(
        balancer=mock_balancer,
        file_manager=mock_file_manager,
        template_filler=mock_template_filler,
    )
    result = use_case.execute(validated_files, **config)

    # Verificação
    assert result.success is False
    assert "Erro de teste" in result.message
    assert result.lots_created == 0
    assert result.files_moved == 0
