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
    
    assert source.exists() # Origem mantida
    assert dest.exists()
    assert dest.read_text() == "content to copy"
