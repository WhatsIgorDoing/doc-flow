import pytest  # Garanta que o pytest está importado

from src.sad_app_v2.core.interfaces import FileSystemOperationError
from src.sad_app_v2.infrastructure.file_system import (
    FileSystemFileRepository,
    SafeFileSystemManager,  # <-- Importar nova classe
)


def test_list_files_finds_all_files(tmp_path):
    """
    Verifica se o repositório encontra arquivos na raiz e em subdiretórios.

    Args:
        tmp_path: Uma fixture do pytest que fornece um diretório temporário.
    """
    # Setup: Criar uma estrutura de arquivos de teste
    (tmp_path / "file1.pdf").touch()
    (tmp_path / "file2.docx").touch()

    sub_dir = tmp_path / "sub"
    sub_dir.mkdir()
    (sub_dir / "file3.txt").touch()

    repo = FileSystemFileRepository()

    # Execução
    files = repo.list_files(tmp_path)

    # Verificação
    assert len(files) == 3

    # Converte os paths para strings para facilitar a verificação
    file_names = {f.path.name for f in files}
    assert "file1.pdf" in file_names
    assert "file2.docx" in file_names
    assert "file3.txt" in file_names


# --- NOVOS TESTES ABAIXO ---


def test_create_directory_creates_dir(tmp_path):
    """Verifica se o diretório é criado com sucesso."""
    manager = SafeFileSystemManager()
    new_dir = tmp_path / "novo_diretorio"

    manager.create_directory(new_dir)

    assert new_dir.exists()
    assert new_dir.is_dir()


def test_copy_file_copies_correctly(tmp_path):
    """Verifica se um arquivo é copiado corretamente."""
    manager = SafeFileSystemManager()
    source_file = tmp_path / "original.txt"
    source_file.write_text("conteúdo de teste")
    dest_file = tmp_path / "copia.txt"

    manager.copy_file(source_file, dest_file)

    assert dest_file.exists()
    assert dest_file.read_text() == "conteúdo de teste"
    assert source_file.exists()  # O original ainda deve existir


def test_copy_file_creates_dest_directory(tmp_path):
    """Verifica se o diretório de destino é criado automaticamente na cópia."""
    manager = SafeFileSystemManager()
    source_file = tmp_path / "original.txt"
    source_file.write_text("conteúdo de teste")
    dest_dir = tmp_path / "novo_diretorio"
    dest_file = dest_dir / "copia.txt"

    # O diretório de destino não existe ainda
    assert not dest_dir.exists()

    manager.copy_file(source_file, dest_file)

    assert dest_file.exists()
    assert dest_file.read_text() == "conteúdo de teste"
    assert dest_dir.exists()  # O diretório foi criado automaticamente


def test_move_file_moves_correctly(tmp_path):
    """Verifica se um arquivo é movido (original é apagado)."""
    manager = SafeFileSystemManager()
    source_file = tmp_path / "original.txt"
    source_file.write_text("conteúdo")
    dest_dir = tmp_path / "destino"
    dest_file = dest_dir / "original.txt"

    manager.move_file(source_file, dest_file)

    assert dest_file.exists()
    assert not source_file.exists()  # O original não deve mais existir


def test_move_non_existent_file_raises_error(tmp_path):
    """Verifica se uma exceção customizada é lançada para arquivos inexistentes."""
    manager = SafeFileSystemManager()
    source_file = tmp_path / "nao_existe.txt"
    dest_file = tmp_path / "destino.txt"

    with pytest.raises(FileSystemOperationError):
        manager.move_file(source_file, dest_file)
