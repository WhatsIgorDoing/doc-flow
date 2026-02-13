import pytest
from app.infrastructure.services import GreedyLotBalancerService
from app.domain.entities import DocumentGroup, DocumentFile, OutputLot
from pathlib import Path

class TestGreedyLotBalancerService:
    def test_balance_lots_empty_groups(self):
        service = GreedyLotBalancerService()
        lots = service.balance_lots([], 10)
        assert lots == []

    def test_balance_lots_single_group(self):
        service = GreedyLotBalancerService()
        groups = [
            DocumentGroup(document_code="DOC-1", files=[DocumentFile(path=Path("f1"), size_bytes=100)])
        ]
        lots = service.balance_lots(groups, 10)
        assert len(lots) == 1
        assert len(lots[0].groups) == 1
        assert lots[0].groups[0].document_code == "DOC-1"

    def test_balance_lots_distribution(self):
        service = GreedyLotBalancerService()
        # Create 10 groups with varying sizes
        groups = []
        for i in range(10):
            groups.append(DocumentGroup(
                document_code=f"DOC-{i}",
                files=[DocumentFile(path=Path(f"f{i}"), size_bytes=(i + 1) * 100)]
            ))

        # Expect 2 lots (10 groups / 5 max_docs = 2 lots)
        lots = service.balance_lots(groups, 5)

        assert len(lots) == 2

        # Total size = sum(100, 200, ..., 1000) = 5500
        # Ideal balance = 2750 per lot

        total_size = sum(lot.total_size_bytes for lot in lots)
        assert total_size == 5500

        # Check that groups are distributed
        assert len(lots[0].groups) > 0
        assert len(lots[1].groups) > 0

    def test_balance_lots_max_docs_zero(self):
        service = GreedyLotBalancerService()
        groups = [DocumentGroup(document_code="DOC-1", files=[DocumentFile(path=Path("f1"), size_bytes=100)])]
        # Should default to 1 lot if max_docs <= 0, or handle gracefully
        lots = service.balance_lots(groups, 0)
        assert len(lots) >= 1
