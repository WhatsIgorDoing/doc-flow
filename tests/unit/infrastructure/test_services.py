from pathlib import Path

from src.sad_app_v2.core.domain import DocumentFile, DocumentGroup
from src.sad_app_v2.infrastructure.services import GreedyLotBalancerService


def test_balancer_distributes_correctly():
    """Verifica se o algoritmo distribui os itens para balancear o tamanho."""
    # Setup: Cria grupos de documentos com tamanhos variados
    group_100 = DocumentGroup("DOC-100", [DocumentFile(Path("f1"), 100)])
    group_80 = DocumentGroup("DOC-80", [DocumentFile(Path("f2"), 80)])
    group_60 = DocumentGroup("DOC-60", [DocumentFile(Path("f3"), 60)])
    group_10 = DocumentGroup("DOC-10", [DocumentFile(Path("f4"), 10)])

    groups = [group_10, group_80, group_100, group_60]  # Desordenados de propósito

    balancer = GreedyLotBalancerService()

    # Execução: Balancear em 2 lotes (max_docs_per_lot = 2)
    lots = balancer.balance_lots(groups, max_docs_per_lot=2)

    # Verificação
    assert len(lots) == 2

    # Lógica do algoritmo guloso:
    # 1. Ordena: [100, 80, 60, 10]
    # 2. Lotes: LoteA(0), LoteB(0)
    # 3. Coloca 100 no LoteA. Lotes: A(100), B(0)
    # 4. Coloca 80 no LoteB. Lotes: A(100), B(80)
    # 5. Coloca 60 no LoteB. Lotes: A(100), B(140)
    # 6. Coloca 10 no LoteA. Lotes: A(110), B(140)

    # Garante que os tamanhos estão corretos
    lot_sizes = sorted([lot.total_size_bytes for lot in lots])
    assert lot_sizes == [110, 140]

    # Garante que os documentos certos estão nos lotes certos
    lot_a = next(lot for lot in lots if lot.total_size_bytes == 110)
    lot_b = next(lot for lot in lots if lot.total_size_bytes == 140)

    lot_a_codes = {g.document_code for g in lot_a.groups}
    lot_b_codes = {g.document_code for g in lot_b.groups}

    assert lot_a_codes == {"DOC-100", "DOC-10"}
    assert lot_b_codes == {"DOC-80", "DOC-60"}


def test_balancer_respects_max_docs_limit():
    """Verifica se o número correto de lotes é criado."""
    # Setup: 7 grupos de documentos
    groups = [
        DocumentGroup(f"DOC-{i}", [DocumentFile(Path(f"f{i}"), 10)]) for i in range(7)
    ]

    balancer = GreedyLotBalancerService()

    # Execução: Limite de 3 documentos por lote
    lots = balancer.balance_lots(groups, max_docs_per_lot=3)

    # Verificação: ceil(7 / 3) = 3 lotes
    assert len(lots) == 3

    # Verifica a distribuição de documentos por lote
    group_counts = sorted([len(lot.groups) for lot in lots])
    # A ordem exata pode variar dependendo do algoritmo guloso
    # Mas o total deve ser 7 e nenhum lote deve exceder 3
    assert sum(group_counts) == 7
    assert all(count <= 3 for count in group_counts)
    assert max(group_counts) == 3  # Pelo menos um lote deve ter 3 documentos
