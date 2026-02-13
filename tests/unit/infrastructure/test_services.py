from pathlib import Path

import pytest

from app.domain.entities import DocumentFile, DocumentGroup
from app.infrastructure.services import GreedyLotBalancerService


class TestGreedyLotBalancerService:
    def test_balance_lots_respects_max_docs_per_lot(self):
        """
        Test that the greedy balancer respects the max_docs_per_lot limit.

        Scenario:
        - 2 large groups (100 bytes)
        - 4 small groups (1 byte)
        - max_docs_per_lot = 2

        Expected:
        - 3 lots (ceil(6/2))
        - No lot should have more than 2 groups.
        """
        # Arrange
        service = GreedyLotBalancerService()

        groups = []

        # 2 Large groups (100 bytes each)
        for i in range(2):
            f = DocumentFile(path=Path(f"large_{i}.pdf"), size_bytes=100)
            g = DocumentGroup(document_code=f"LARGE-{i}", files=[f])
            groups.append(g)

        # 4 Small groups (1 byte each)
        for i in range(4):
            f = DocumentFile(path=Path(f"small_{i}.pdf"), size_bytes=1)
            g = DocumentGroup(document_code=f"SMALL-{i}", files=[f])
            groups.append(g)

        max_docs_per_lot = 2

        # Act
        lots = service.balance_lots(groups, max_docs_per_lot)

        # Assert
        # Check that we have the expected number of lots
        # Total 6 items, max 2 per lot -> 3 lots
        assert len(lots) == 3

        # Check that no lot has more than max_docs_per_lot
        for lot in lots:
            assert (
                len(lot.groups) <= max_docs_per_lot
            ), f"Lot {lot.lot_name} has {len(lot.groups)} groups, exceeding limit {max_docs_per_lot}. Groups: {[g.document_code for g in lot.groups]} Size: {lot.total_size_bytes}"

    def test_balance_lots_empty_groups(self):
        """Test balancing empty list of groups."""
        service = GreedyLotBalancerService()
        lots = service.balance_lots([], 10)
        assert lots == []

    def test_balance_lots_max_docs_larger_than_total(self):
        """Test when max_docs_per_lot is larger than total groups."""
        service = GreedyLotBalancerService()
        groups = [
            DocumentGroup(
                document_code="G1", files=[DocumentFile(path=Path("f1"), size_bytes=10)]
            ),
            DocumentGroup(
                document_code="G2", files=[DocumentFile(path=Path("f2"), size_bytes=10)]
            ),
        ]
        # max_docs=5, total=2. num_lots = ceil(2/5) = 1.
        lots = service.balance_lots(groups, 5)
        assert len(lots) == 1
        assert len(lots[0].groups) == 2

    def test_balance_lots_max_docs_equals_one(self):
        """Test when max_docs_per_lot is 1."""
        service = GreedyLotBalancerService()
        groups = [
            DocumentGroup(
                document_code="G1", files=[DocumentFile(path=Path("f1"), size_bytes=10)]
            ),
            DocumentGroup(
                document_code="G2", files=[DocumentFile(path=Path("f2"), size_bytes=20)]
            ),
        ]
        # max_docs=1, total=2. num_lots = ceil(2/1) = 2.
        lots = service.balance_lots(groups, 1)
        assert len(lots) == 2
        assert len(lots[0].groups) == 1
        assert len(lots[1].groups) == 1

    def test_balance_lots_invalid_max_docs(self):
        """Test when max_docs_per_lot is invalid (<=0)."""
        service = GreedyLotBalancerService()
        groups = [
            DocumentGroup(
                document_code="G1", files=[DocumentFile(path=Path("f1"), size_bytes=10)]
            ),
            DocumentGroup(
                document_code="G2", files=[DocumentFile(path=Path("f2"), size_bytes=10)]
            ),
        ]
        # max_docs=0 -> defaults to len(groups)=2 -> num_lots=1
        lots = service.balance_lots(groups, 0)
        assert len(lots) == 1
        assert len(lots[0].groups) == 2
