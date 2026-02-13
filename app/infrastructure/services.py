"""
Serviços de domínio da infraestrutura.
"""

import heapq
import math
from typing import List

from app.core.interfaces import ILotBalancerService
from app.domain.entities import DocumentGroup, OutputLot


class GreedyLotBalancerService(ILotBalancerService):
    """Implementa o algoritmo 'guloso' para balancear lotes."""

    def balance_lots(
        self, groups: List[DocumentGroup], max_docs_per_lot: int
    ) -> List[OutputLot]:
        if not groups:
            return []

        # 1. Ordena os grupos de documentos do maior para o menor
        sorted_groups = sorted(
            groups, key=lambda g: sum(f.size_bytes for f in g.files), reverse=True
        )

        # 2. Determina o número de lotes necessários
        if max_docs_per_lot <= 0:
            max_docs_per_lot = len(sorted_groups) or 1

        # Lógica original usava max_docs por lote como referência de QUANTIDADE de grupos
        # Mas a assinatura sugere número de documentos?
        # Revisando a lógica original:
        # "num_lots = math.ceil(len(sorted_groups) / max_docs_per_lot)"
        # Isso implica que max_docs_per_lot estava sendo tratado como max_GROUPS_per_lot na estimativa inicial?
        # Mas depois ele balanceia o TAMANHO (bytes).
        # Vamos manter a lógica original "Greedy" que tenta distribuir o PESO (bytes) uniformemente
        # entre N lotes fixos baseados na contagem inicial.

        num_lots = math.ceil(len(sorted_groups) / max_docs_per_lot)
        if num_lots < 1:
            num_lots = 1

        # 3. Inicializa os lotes de saída
        # Armazena os lotes e mantém uma tupla para o heap: (tamanho_atual, indice, lote)
        # O indice é usado para desempate estável
        lots: List[OutputLot] = []
        heap = []

        for i in range(num_lots):
            lot = OutputLot(lot_name=f"Lote_{i + 1}")
            lots.append(lot)
            heapq.heappush(heap, (0, i, lot))

        # 4. Distribui os grupos para o lote atualmente mais leve (em bytes) usando min-heap
        for group in sorted_groups:
            # Pega o lote mais leve (O(1))
            current_size, idx, lightest_lot = heapq.heappop(heap)

            # Adiciona o grupo
            lightest_lot.groups.append(group)

            # Calcula o tamanho do grupo uma única vez
            group_size = group.total_size_bytes

            # Atualiza e reinsere no heap (O(log M))
            new_size = current_size + group_size
            heapq.heappush(heap, (new_size, idx, lightest_lot))

        return lots
