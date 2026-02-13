import pytest
from pathlib import Path
from app.infrastructure.repositories import FileSystemManager


@pytest.mark.asyncio
async def test_create_directory_success(tmp_path):
    """Testa criação de diretório."""
    manager = FileSystemManager()
    target_dir = tmp_path / "new_folder" / "nested"

    await manager.create_directory(target_dir)

    assert target_dir.exists()
    assert target_dir.is_dir()


@pytest.mark.asyncio
async def test_move_file_success(tmp_path):
    """Testa movimentação de arquivo."""
    manager = FileSystemManager()

    source = tmp_path / "source.txt"
    source.write_text("content")

    dest = tmp_path / "dest_folder" / "moved.txt"

    # Dest folder não existe, o manager deve criar
    await manager.move_file(source, dest)

    assert not source.exists()
    assert dest.exists()
    assert dest.read_text() == "content"


@pytest.mark.asyncio
async def test_copy_file_success(tmp_path):
    """Testa cópia de arquivo."""
    manager = FileSystemManager()

    source = tmp_path / "original.txt"
    source.write_text("content to copy")

    dest = tmp_path / "backup" / "copy.txt"

    await manager.copy_file(source, dest)

    assert source.exists()  # Origem mantida
    assert dest.exists()
    assert dest.read_text() == "content to copy"


@pytest.mark.asyncio
async def test_rename_file_simple(tmp_path):
    """Testa renomeação simples de arquivo."""
    manager = FileSystemManager()

    source = tmp_path / "old_name.pdf"
    source.write_text("pdf content")

    result = await manager.rename_file(source, "new_name.pdf")

    assert not source.exists()
    assert result.exists()
    assert result.name == "new_name.pdf"
    assert result.read_text() == "pdf content"


@pytest.mark.asyncio
async def test_rename_file_conflict_resolution(tmp_path):
    """Testa renomeação quando o destino já existe."""
    manager = FileSystemManager()

    source = tmp_path / "doc_original.pdf"
    source.write_text("original")

    # Criar arquivo conflitante
    conflict = tmp_path / "doc_final.pdf"
    conflict.write_text("existing")

    result = await manager.rename_file(source, "doc_final.pdf")

    assert not source.exists()
    assert conflict.exists()  # O conflitante permanece
    assert result.exists()
    assert result.name == "doc_final_001.pdf"  # Sufixo numérico
    assert result.read_text() == "original"


@pytest.mark.asyncio
async def test_rename_file_source_not_found(tmp_path):
    """Testa erro quando arquivo fonte não existe."""
    from app.domain.exceptions import FileOperationError

    manager = FileSystemManager()
    source = tmp_path / "nonexistent.pdf"

    with pytest.raises(FileOperationError, match="does not exist"):
        await manager.rename_file(source, "new_name.pdf")
