import math
from typing import List

from ..core.domain import DocumentGroup, OutputLot
from ..core.interfaces import ILotBalancerService


class GreedyLotBalancerService(ILotBalancerService):
    """Implementa o algoritmo 'guloso' para balancear lotes."""

    def balance_lots(
        self, groups: List[DocumentGroup], max_docs_per_lot: int
    ) -> List[OutputLot]:
        if not groups:
            return []

        # 1. Ordena os grupos de documentos do maior para o menor
        # Usamos uma função anônima (lambda) para especificar que a chave
        # de ordenação é o tamanho total de cada grupo.
        sorted_groups = sorted(
            groups, key=lambda g: sum(f.size_bytes for f in g.files), reverse=True
        )

        # 2. Determina o número de lotes necessários
        # O limite é por 'documento' (que é um DocumentGroup), não por arquivo.
        if max_docs_per_lot <= 0:
            max_docs_per_lot = len(sorted_groups)  # Evita divisão por zero

        num_lots = math.ceil(len(sorted_groups) / max_docs_per_lot)

        # 3. Inicializa os lotes de saída
        lots: List[OutputLot] = [
            OutputLot(lot_name=f"Lote_{i + 1}") for i in range(num_lots)
        ]

        # 4. Distribui os grupos para o lote atualmente mais leve
        for group in sorted_groups:
            # Encontra o lote com o menor tamanho total em bytes
            lightest_lot = min(lots, key=lambda lot: lot.total_size_bytes)

            # Adiciona o grupo ao lote mais leve
            lightest_lot.groups.append(group)
            # O tamanho total é calculado automaticamente pela propriedade

        return lots
