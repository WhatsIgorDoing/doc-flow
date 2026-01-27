"""
Service para organização de lotes de documentos.
Implementa UC-03: Organizar e Gerar Lotes de Saída.
"""

from pathlib import Path
from typing import Dict, List

from app.core.logger import app_logger
from app.domain.entities import (
    DocumentFile,
    DocumentGroup,
    OrganizationResult,
    OutputLot,
)
from app.domain.exceptions import OrganizationError
from app.infrastructure.repositories import FileSystemManager


def _get_filename_with_revision(original_filename: str, revision: str) -> str:
    """
    Adiciona revisão ao nome do arquivo antes da extensão.
    Evita duplicação se a revisão já existir.

    Examples:
        'arquivo.pdf' + 'A' -> 'arquivo_A.pdf'
        'arquivo_A.pdf' + 'A' -> 'arquivo_A.pdf' (não duplica)

    Args:
        original_filename: Nome do arquivo original
        revision: String de revisão a adicionar

    Returns:
        Nome do arquivo com revisão
    """
    name_parts = original_filename.rsplit(".", 1)

    if len(name_parts) == 2:
        base_name, extension = name_parts
        # Verifica se já termina com _revisão
        if base_name.endswith(f"_{revision}"):
            return original_filename
        else:
            return f"{base_name}_{revision}.{extension}"
    else:
        # Arquivo sem extensão
        if original_filename.endswith(f"_{revision}"):
            return original_filename
        else:
            return f"{original_filename}_{revision}"


class OrganizationService:
    """
    Service para organização e geração de lotes de saída.
    Implementa UC-03: Organizar e Gerar Lotes de Saída.
    """

    def __init__(self, file_manager: FileSystemManager):
        """
        Inicializa o service com injeção de dependências.

        Args:
            file_manager: Gerenciador de operações do sistema de arquivos
        """
        self._file_manager = file_manager

    def _group_files_by_code(
        self, validated_files: List[DocumentFile]
    ) -> List[DocumentGroup]:
        """
        Agrupa arquivos pelo código do documento.

        Args:
            validated_files: Lista de arquivos validados

        Returns:
            Lista de grupos de documentos
        """
        groups_map: Dict[str, DocumentGroup] = {}

        for file in validated_files:
            # Usa código do manifesto ou nome do arquivo como fallback
            if file.associated_manifest_item:
                code = file.associated_manifest_item.document_code
            else:
                code = file.path.stem

            if code not in groups_map:
                groups_map[code] = DocumentGroup(document_code=code)
            groups_map[code].files.append(file)

        return list(groups_map.values())

    def _balance_lots(
        self, groups: List[DocumentGroup], max_docs_per_lot: int
    ) -> List[OutputLot]:
        """
        Distribui grupos de documentos em lotes balanceados.

        Args:
            groups: Lista de grupos de documentos
            max_docs_per_lot: Máximo de documentos por lote

        Returns:
            Lista de lotes balanceados
        """
        # Ordena grupos por tamanho (maior primeiro) para melhor balanceamento
        sorted_groups = sorted(groups, key=lambda g: g.total_size_bytes, reverse=True)

        lots: List[OutputLot] = []
        current_lot: List[DocumentGroup] = []
        current_count = 0

        for group in sorted_groups:
            # Se adicionar esse grupo ultrapassa o limite, cria novo lote
            if current_count + len(group.files) > max_docs_per_lot and current_lot:
                lots.append(OutputLot(lot_name="", groups=current_lot.copy()))
                current_lot = []
                current_count = 0

            current_lot.append(group)
            current_count += len(group.files)

        # Adiciona o último lote se houver grupos restantes
        if current_lot:
            lots.append(OutputLot(lot_name="", groups=current_lot))

        return lots

    async def organize_and_generate_lots(
        self,
        validated_files: List[DocumentFile],
        output_directory: Path,
        max_docs_per_lot: int,
        start_sequence_number: int,
        lot_name_pattern: str,
    ) -> OrganizationResult:
        """
        Organiza arquivos validados em lotes e move para diretório de saída.

        Args:
            validated_files: Lista de arquivos validados
            output_directory: Diretório de saída para os lotes
            max_docs_per_lot: Máximo de documentos por lote
            start_sequence_number: Número inicial da sequência de lotes
            lot_name_pattern: Padrão de nome do lote (usar XXXX para sequência)

        Returns:
            OrganizationResult com estatísticas da operação

        Raises:
            OrganizationError: Se houver erro durante a organização
        """
        try:
            app_logger.info(
                "Starting lot organization",
                extra={
                    "validated_files_count": len(validated_files),
                    "output_directory": str(output_directory),
                    "max_docs_per_lot": max_docs_per_lot,
                },
            )

            # 1. Agrupa arquivos por código
            groups = self._group_files_by_code(validated_files)
            app_logger.debug("Files grouped", extra={"groups_count": len(groups)})

            # 2. Balanceia grupos em lotes
            output_lots = self._balance_lots(groups, max_docs_per_lot)
            app_logger.debug("Lots balanced", extra={"lots_count": len(output_lots)})

            files_moved_count = 0

            # 3. Loop de execução: nomenclatura, movimentação
            for i, lot in enumerate(output_lots):
                seq_number = start_sequence_number + i
                lot_name = lot_name_pattern.replace("XXXX", f"{seq_number:04d}")
                lot.lot_name = lot_name

                lot_directory_path = output_directory / lot_name

                # 3a. Cria diretório do lote
                await self._file_manager.create_directory(lot_directory_path)

                # 3b. Move arquivos
                for group in lot.groups:
                    for file in group.files:
                        # Obtém informações do manifesto
                        manifest_item = file.associated_manifest_item
                        revision = manifest_item.revision if manifest_item else "0"

                        # Constrói novo nome com revisão
                        new_filename = _get_filename_with_revision(
                            file.path.name, revision
                        )

                        destination_path = lot_directory_path / new_filename

                        # Move arquivo
                        await self._file_manager.move_file(file.path, destination_path)
                        files_moved_count += 1

                app_logger.debug(
                    "Lot processed",
                    extra={
                        "lot_name": lot_name,
                        "files_moved": len(lot.files),
                    },
                )

            app_logger.info(
                "Lot organization completed",
                extra={
                    "lots_created": len(output_lots),
                    "files_moved": files_moved_count,
                },
            )

            return OrganizationResult(
                lots_created=len(output_lots),
                files_moved=files_moved_count,
                success=True,
                message=f"Created {len(output_lots)} lots with {files_moved_count} files",
            )

        except Exception as e:
            app_logger.error(
                "Organization failed",
                extra={"error": str(e), "error_type": type(e).__name__},
            )
            raise OrganizationError(f"Organization failed: {e}")
