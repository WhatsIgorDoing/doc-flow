import pytest
from pathlib import Path
from app.domain.entities import DocumentFile
from app.domain.exceptions import SourceDirectoryNotFoundError
from app.infrastructure.repositories import FileRepository


@pytest.mark.asyncio
async def test_list_files_recursive(tmp_path):
    """Testa listagem recursiva de arquivos usando diretório temporário real."""
    # Setup: Criar estrutura de arquivos no tmp_path
    # tmp_path/
    #   ├── file1.pdf
    #   ├── subfolder/
    #   │   └── file2.docx
    #   └── empty_folder/
    
    d = tmp_path / "subfolder"
    d.mkdir()
    p1 = tmp_path / "file1.pdf"
    p1.write_text("content")
    p2 = d / "file2.docx"
    p2.write_text("content")
    
    (tmp_path / "empty_folder").mkdir()

    repo = FileRepository()
    
    files = await repo.list_files(tmp_path)

    # Verificação
    # Deve encontrar 2 arquivos
    assert len(files) == 2
    
    filenames = [f.path.name for f in files]
    assert "file1.pdf" in filenames
    assert "file2.docx" in filenames
    
    # Verifica se tamanho foi lido (content tem 7 bytes)
    assert all(f.size_bytes > 0 for f in files)


@pytest.mark.asyncio
async def test_list_files_not_found(tmp_path):
    """Testa erro quando diretório não existe."""
    repo = FileRepository()
    non_existent = tmp_path / "ghost_folder"

    with pytest.raises(SourceDirectoryNotFoundError) as exc:
        await repo.list_files(non_existent)
    
    assert "Directory not found" in str(exc.value)


@pytest.mark.asyncio
async def test_list_files_is_file(tmp_path):
    """Testa erro quando path é arquivo e não diretório."""
    repo = FileRepository()
    file_path = tmp_path / "just_a_file.txt"
    file_path.write_text("hello")

    with pytest.raises(SourceDirectoryNotFoundError) as exc:
        await repo.list_files(file_path)
    
    assert "Not a directory" in str(exc.value)
