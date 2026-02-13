"""
Serviços de domínio da infraestrutura.
"""

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
        lots: List[OutputLot] = [
            OutputLot(lot_name=f"Lote_{i + 1}") for i in range(num_lots)
        ]

        # 4. Distribui os grupos para o lote atualmente mais leve (em bytes)
        for group in sorted_groups:
            # Encontra o lote com o menor tamanho total em bytes,
            # respeitando o limite de documentos por lote
            candidate_lots = [
                lot for lot in lots if len(lot.groups) < max_docs_per_lot
            ]

            # Fallback de segurança: se por algum erro de cálculo não houver lotes disponíveis,
            # usa todos os lotes (evita crash, mas pode violar a regra de quantidade)
            if not candidate_lots:
                candidate_lots = lots

            lightest_lot = min(candidate_lots, key=lambda lot: lot.total_size_bytes)
            lightest_lot.groups.append(group)

        return lots
