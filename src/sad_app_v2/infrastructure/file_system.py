import shutil  # Usaremos shutil para operações de arquivo mais robustas
from pathlib import Path
from typing import List

from ..core.domain import DocumentFile
from ..core.interfaces import (
    FileSystemOperationError,  # <-- Importar nova exceção
    IFileRepository,
    IFileSystemManager,  # <-- Importar nova interface
    SourceDirectoryNotFoundError,
)


class FileSystemFileRepository(IFileRepository):
    """Implementação concreta que lista arquivos de um diretório no disco."""

    def list_files(self, directory: Path) -> List[DocumentFile]:
        if not directory.is_dir():
            raise SourceDirectoryNotFoundError(f"Diretório não encontrado: {directory}")

        found_files: List[DocumentFile] = []

        # .rglob('*') busca recursivamente por todos os arquivos
        for path in directory.rglob("*"):
            if path.is_file():
                found_files.append(
                    DocumentFile(path=path, size_bytes=path.stat().st_size)
                )
        return found_files


# --- NOVA CLASSE ABAIXO ---


class SafeFileSystemManager(IFileSystemManager):
    """
    Implementação concreta para operações físicas de arquivo, com tratamento
    de erros robusto.
    """

    def create_directory(self, path: Path) -> None:
        try:
            path.mkdir(parents=True, exist_ok=True)
        except (OSError, PermissionError) as e:
            raise FileSystemOperationError(f"Falha ao criar diretório {path}: {e}")

    def move_file(self, source: Path, destination: Path) -> None:
        try:
            # Garante que o diretório de destino exista
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(source), str(destination))
        except (FileNotFoundError, shutil.Error, OSError, PermissionError) as e:
            raise FileSystemOperationError(
                f"Falha ao mover {source} para {destination}: {e}"
            )

    def copy_file(self, source: Path, destination: Path) -> None:
        try:
            # Garante que o diretório de destino exista
            destination.parent.mkdir(parents=True, exist_ok=True)
            # shutil.copy2 preserva mais metadados do que copy
            shutil.copy2(str(source), str(destination))
        except (FileNotFoundError, shutil.Error, OSError, PermissionError) as e:
            raise FileSystemOperationError(
                f"Falha ao copiar {source} para {destination}: {e}"
            )
