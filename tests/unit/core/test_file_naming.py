"""
Testes unitários para app.domain.file_naming.
Cobre get_filename_with_revision e generate_unique_filename.
"""

import pytest
from pathlib import Path

from app.domain.file_naming import get_filename_with_revision, generate_unique_filename


class TestGetFilenameWithRevision:
    """Testes para get_filename_with_revision."""

    @pytest.mark.parametrize(
        "original, revision, expected",
        [
            ("arquivo.pdf", "A", "arquivo_A.pdf"),
            ("DOC-001.docx", "B", "DOC-001_B.docx"),
            ("arquivo_A.pdf", "A", "arquivo_A.pdf"),  # No duplication
            ("arquivo", "B", "arquivo_B"),  # No extension
            ("arquivo_B", "B", "arquivo_B"),  # No duplication without extension
            ("DOC-123.pdf", "0", "DOC-123_0.pdf"),
            ("DOC-123_0.pdf", "0", "DOC-123_0.pdf"),  # Numeric revision
            ("DOC-123.pdf", "", "DOC-123_.pdf"),  # Empty revision
            ("DOC.pdf", "Rev3", "DOC_Rev3.pdf"),  # Long revision
            # Edge cases
            (".gitignore", "A", ".gitignore_A"),  # Hidden file (expect fix)
            (".config", "v1", ".config_v1"),
            ("archive.tar.gz", "A", "archive.tar_A.gz"),
            ("file.", "A", "file._A"),  # Trailing dot
            ("my file.pdf", "A", "my file_A.pdf"),  # Spaces
            ("..dots", "A", "._A.dots"),  # weird case, consistent with pathlib
            # Case sensitivity check
            ("file_a.pdf", "A", "file_a_A.pdf"),
        ],
    )
    def test_get_filename_with_revision(self, original, revision, expected):
        assert get_filename_with_revision(original, revision) == expected


class TestGenerateUniqueFilename:
    """Testes para generate_unique_filename (mantendo os existentes)."""

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
