"""
Repositórios assíncronos para acesso a dados.
Implementa padrão Repository com I/O não bloqueante.
"""

import asyncio
from pathlib import Path
from typing import List

import aiofiles
import openpyxl
from openpyxl.worksheet.worksheet import Worksheet

from app.core.interfaces import (
    IFileRepository,
    IFileSystemManager,
    IManifestRepository,
)
from app.core.logger import app_logger
from app.domain.entities import DocumentFile, ManifestItem
from app.domain.exceptions import (
    FileOperationError,
    FileReadError,
    ManifestParseError,
    ManifestReadError,
    SourceDirectoryNotFoundError,
)


class ManifestRepository(IManifestRepository):
    """Repositório para leitura de manifestos Excel de forma assíncrona."""

    async def load_from_file(self, file_path: Path) -> List[ManifestItem]:
        """
        Carrega itens do manifesto de um arquivo Excel.

        Args:
            file_path: Caminho para o arquivo Excel do manifesto

        Returns:
            Lista de itens do manifesto

        Raises:
            ManifestReadError: Se o arquivo não existir ou houver erro de leitura
            ManifestParseError: Se houver erro ao parsear os dados
        """
        if not file_path.exists():
            app_logger.error(
                "Manifest file not found", extra={"file_path": str(file_path)}
            )
            raise ManifestReadError(f"Manifest file not found: {file_path}")

        try:
            # openpyxl não é nativo async, então rodamos em executor
            loop = asyncio.get_event_loop()
            items = await loop.run_in_executor(None, self._read_excel_sync, file_path)

            app_logger.info(
                "Manifest loaded successfully",
                extra={"file_path": str(file_path), "items_count": len(items)},
            )
            return items

        except ManifestReadError:
            raise
        except Exception as e:
            app_logger.error(
                "Error parsing manifest",
                extra={"file_path": str(file_path), "error": str(e)},
            )
            raise ManifestParseError(f"Error parsing manifest: {e}")

    def _read_excel_sync(self, file_path: Path) -> List[ManifestItem]:
        """
        Leitura síncrona do Excel (executada em thread pool).

        Args:
            file_path: Caminho do arquivo Excel

        Returns:
            Lista de itens do manifesto
        """
        workbook = openpyxl.load_workbook(file_path, read_only=True)
        sheet: Worksheet = workbook.active

        items: List[ManifestItem] = []

        # Obtém cabeçalho (primeira linha)
        header = [cell.value for cell in sheet[1]]

        # Itera sobre as linhas, pulando o cabeçalho
        for row in sheet.iter_rows(min_row=2, values_only=True):
            # Ignora linhas vazias
            if not any(row):
                continue

            # Mapeamento de colunas: A=0 (code), B=1 (revision), C=2 (title)
            document_code = str(row[0]) if row[0] else ""
            revision = str(row[1]) if row[1] else "0"
            title = str(row[2]) if row[2] else ""

            # Coleta metadados extras a partir da coluna D (índice 3)
            metadata = {
                header[i]: row[i]
                for i in range(3, len(row))
                if i < len(header) and row[i] is not None
            }

            items.append(
                ManifestItem(
                    document_code=document_code,
                    revision=revision,
                    title=title,
                    metadata=metadata,
                )
            )

        workbook.close()
        return items


class FileRepository(IFileRepository):
    """Repositório para operações com arquivos do sistema de forma assíncrona."""

    async def list_files(self, directory: Path) -> List[DocumentFile]:
        """
        Lista todos os arquivos em um diretório recursivamente.

        Args:
            directory: Caminho do diretório a ser escaneado

        Returns:
            Lista de arquivos encontrados

        Raises:
            SourceDirectoryNotFoundError: Se o diretório não existir
            FileReadError: Se houver erro ao ler os arquivos
        """
        if not directory.exists():
            app_logger.error(
                "Source directory not found", extra={"directory": str(directory)}
            )
            raise SourceDirectoryNotFoundError(f"Directory not found: {directory}")

        if not directory.is_dir():
            app_logger.error("Path is not a directory", extra={"path": str(directory)})
            raise SourceDirectoryNotFoundError(f"Not a directory: {directory}")

        try:
            # Listagem de arquivos em thread pool (operação I/O)
            loop = asyncio.get_event_loop()
            files = await loop.run_in_executor(None, self._list_files_sync, directory)

            app_logger.info(
                "Files listed successfully",
                extra={"directory": str(directory), "files_count": len(files)},
            )
            return files

        except (SourceDirectoryNotFoundError, FileReadError):
            raise
        except Exception as e:
            app_logger.error(
                "Error listing files",
                extra={"directory": str(directory), "error": str(e)},
            )
            raise FileReadError(f"Error listing files: {e}")

    def _list_files_sync(self, directory: Path) -> List[DocumentFile]:
        """
        Listagem síncrona de arquivos (executada em thread pool).

        Args:
            directory: Diretório a ser escaneado

        Returns:
            Lista de DocumentFile
        """
        found_files: List[DocumentFile] = []

        # .rglob('*') busca recursivamente por todos os arquivos
        for path in directory.rglob("*"):
            if path.is_file():
                try:
                    size_bytes = path.stat().st_size
                    found_files.append(DocumentFile(path=path, size_bytes=size_bytes))
                except OSError as e:
                    app_logger.warning(
                        "Could not read file stats",
                        extra={"file": str(path), "error": str(e)},
                    )
                    continue

        return found_files


class FileSystemManager(IFileSystemManager):
    """Gerenciador de operações do sistema de arquivos de forma assíncrona."""

    async def create_directory(self, path: Path) -> None:
        """
        Cria um diretório e todos os pais necessários.

        Args:
            path: Caminho do diretório a ser criado

        Raises:
            FileOperationError: Se houver erro ao criar o diretório
        """
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None, path.mkdir, True, True
            )  # parents=True, exist_ok=True

            app_logger.debug("Directory created", extra={"directory": str(path)})

        except Exception as e:
            app_logger.error(
                "Failed to create directory",
                extra={"directory": str(path), "error": str(e)},
            )
            raise FileOperationError(f"Failed to create directory {path}: {e}")

    async def move_file(self, source: Path, destination: Path) -> None:
        """
        Move um arquivo de origem para destino.

        Args:
            source: Caminho do arquivo de origem
            destination: Caminho de destino

        Raises:
            FileOperationError: Se houver erro ao mover o arquivo
        """
        try:
            # Garante que o diretório de destino exista
            await self.create_directory(destination.parent)

            # Move o arquivo em thread pool
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, source.rename, destination)

            app_logger.debug(
                "File moved",
                extra={"source": str(source), "destination": str(destination)},
            )

        except Exception as e:
            app_logger.error(
                "Failed to move file",
                extra={
                    "source": str(source),
                    "destination": str(destination),
                    "error": str(e),
                },
            )
            raise FileOperationError(f"Failed to move {source} to {destination}: {e}")

    async def copy_file(self, source: Path, destination: Path) -> None:
        """
        Copia um arquivo usando aiofiles para I/O assíncrono.

        Args:
            source: Caminho do arquivo de origem
            destination: Caminho de destino

        Raises:
            FileOperationError: Se houver erro ao copiar o arquivo
        """
        try:
            # Garante que o diretório de destino exista
            await self.create_directory(destination.parent)

            # Copia arquivo de forma assíncrona
            async with aiofiles.open(source, "rb") as src:
                async with aiofiles.open(destination, "wb") as dst:
                    while chunk := await src.read(1024 * 1024):  # 1MB chunks
                        await dst.write(chunk)

            app_logger.debug(
                "File copied",
                extra={"source": str(source), "destination": str(destination)},
            )

        except Exception as e:
            app_logger.error(
                "Failed to copy file",
                extra={
                    "source": str(source),
                    "destination": str(destination),
                    "error": str(e),
                },
            )
            raise FileOperationError(f"Failed to copy {source} to {destination}: {e}")
