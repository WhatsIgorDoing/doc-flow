"""
Testes unitários para app.domain.file_naming.
Cobre get_filename_with_revision e generate_unique_filename.
"""

from pathlib import Path

import pytest

from app.domain.file_naming import generate_unique_filename, get_filename_with_revision


class TestGetFilenameWithRevision:
    """Testes para get_filename_with_revision."""

    def test_adds_revision_to_pdf(self):
        assert get_filename_with_revision("arquivo.pdf", "A") == "arquivo_A.pdf"

    def test_adds_revision_to_docx(self):
        assert get_filename_with_revision("DOC-001.docx", "B") == "DOC-001_B.docx"

    def test_no_duplication_when_revision_exists(self):
        assert get_filename_with_revision("arquivo_A.pdf", "A") == "arquivo_A.pdf"

    def test_adds_revision_without_extension(self):
        assert get_filename_with_revision("arquivo", "B") == "arquivo_B"

    def test_no_duplication_without_extension(self):
        assert get_filename_with_revision("arquivo_B", "B") == "arquivo_B"

    def test_numeric_revision(self):
        assert get_filename_with_revision("DOC-123.pdf", "0") == "DOC-123_0.pdf"

    def test_numeric_revision_no_duplication(self):
        assert get_filename_with_revision("DOC-123_0.pdf", "0") == "DOC-123_0.pdf"

    def test_empty_revision(self):
        assert get_filename_with_revision("DOC-123.pdf", "") == "DOC-123_.pdf"

    def test_long_revision(self):
        assert get_filename_with_revision("DOC.pdf", "Rev3") == "DOC_Rev3.pdf"


class TestGenerateUniqueFilename:
    """Testes para generate_unique_filename."""

    def test_first_conflict_gets_001(self, tmp_path):
        existing = tmp_path / "doc.pdf"
        existing.write_text("content")

        result = generate_unique_filename(existing)
        assert result == tmp_path / "doc_001.pdf"

    def test_second_conflict_gets_002(self, tmp_path):
        (tmp_path / "doc.pdf").write_text("content")
        (tmp_path / "doc_001.pdf").write_text("content")

        result = generate_unique_filename(tmp_path / "doc.pdf")
        assert result == tmp_path / "doc_002.pdf"

    def test_preserves_extension(self, tmp_path):
        existing = tmp_path / "report.docx"
        existing.write_text("content")

        result = generate_unique_filename(existing)
        assert result.suffix == ".docx"
        assert result.stem == "report_001"

    def test_file_without_extension(self, tmp_path):
        existing = tmp_path / "README"
        existing.write_text("content")

        result = generate_unique_filename(existing)
        assert result == tmp_path / "README_001"

    def test_non_existing_path_returns_001(self, tmp_path):
        """Even if the original doesn't exist, we generate sequential names."""
        target = tmp_path / "new_file.pdf"
        result = generate_unique_filename(target)
        assert result == tmp_path / "new_file_001.pdf"
