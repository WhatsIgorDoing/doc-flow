"""
UC-03: Organizar e Gerar Lotes de Saída.
Distribui documentos validados em lotes balanceados e move para diretório de saída.
"""

from pathlib import Path
from typing import Dict, List

from app.core.interfaces import (IFileSystemManager, ILotBalancerService,
                                 ITemplateFiller)
from app.core.logger import app_logger
from app.domain.entities import DocumentFile, DocumentGroup, OrganizationResult
from app.domain.file_naming import get_filename_with_revision


class OrganizeLotsUseCase:
    """
    Implementa o Caso de Uso UC-03: Organizar e Gerar Lotes de Saída.
    """

    def __init__(
        self,
        balancer: ILotBalancerService,
        file_manager: IFileSystemManager,
        template_filler: ITemplateFiller,
    ):
        """
        Inicializa o caso de uso com as dependências.

        Args:
            balancer: Serviço de balanceamento de lotes
            file_manager: Gerenciador de operações do sistema de arquivos
            template_filler: Serviço de preenchimento de templates Excel
        """
        self._balancer = balancer
        self._file_manager = file_manager
        self._template_filler = template_filler

    async def execute(
        self,
        validated_files: List[DocumentFile],
        output_directory: Path,
        master_template_path: Path,
        max_docs_per_lot: int,
        start_sequence_number: int,
        lot_name_pattern: str,
    ) -> OrganizationResult:
        """
        Executa o fluxo principal do caso de uso.

        Args:
            validated_files: Lista de arquivos validados
            output_directory: Diretório de saída para os lotes
            master_template_path: Caminho do template Excel mestre
            max_docs_per_lot: Máximo de documentos por lote
            start_sequence_number: Número inicial da sequência de lotes
            lot_name_pattern: Padrão de nome do lote (usar XXXX para sequência)

        Returns:
            OrganizationResult com estatísticas da operação

        Raises:
            FileSystemOperationError: Se houver erro em operações de arquivo
            TemplateFillError: Se houver erro ao preencher template
        """
        try:
            app_logger.info(
                "Iniciando organização de lotes",
                extra={
                    "validated_files_count": len(validated_files),
                    "output_directory": str(output_directory),
                    "max_docs_per_lot": max_docs_per_lot,
                },
            )

            # 1. Agrupamento por código de documento
            groups_map: Dict[str, DocumentGroup] = {}
            for file in validated_files:
                # Verificar se o arquivo tem um item do manifesto associado
                if file.associated_manifest_item is None:
                    # Para arquivos sem item do manifesto, usar nome base como código
                    code = file.path.stem  # Nome do arquivo sem extensão
                else:
                    code = file.associated_manifest_item.document_code

                if code not in groups_map:
                    groups_map[code] = DocumentGroup(document_code=code)
                groups_map[code].files.append(file)

            groups = list(groups_map.values())
            app_logger.debug("Arquivos agrupados", extra={"groups_count": len(groups)})

            # 2. Balanceamento em lotes
            output_lots = self._balancer.balance_lots(groups, max_docs_per_lot)
            app_logger.debug(
                "Lotes balanceados", extra={"lots_count": len(output_lots)}
            )

            files_moved_count = 0

            # 3. Loop de Execução (Nomenclatura, Movimentação, Preenchimento)
            for i, lot in enumerate(output_lots):
                seq_number = start_sequence_number + i
                lot_name = lot_name_pattern.replace("XXXX", f"{seq_number:04d}")
                lot.lot_name = lot_name

                lot_directory_path = output_directory / lot_name

                # 3a. Criação de Diretório
                await self._file_manager.create_directory(lot_directory_path)

                # 3b. Movimentação dos Arquivos
                for group in lot.groups:
                    for file in group.files:
                        # Obter informações do manifesto
                        manifest_item = file.associated_manifest_item
                        revision = manifest_item.revision if manifest_item else "0"

                        # Construir novo nome do arquivo com revisão
                        new_filename = get_filename_with_revision(
                            file.path.name, revision
                        )

                        destination_path = lot_directory_path / new_filename
                        await self._file_manager.move_file(file.path, destination_path)
                        files_moved_count += 1

                # 3c. Preenchimento do Manifesto de Lote
                output_manifest_path = lot_directory_path / f"{lot_name}.xlsx"
                await self._template_filler.fill_and_save(
                    master_template_path, output_manifest_path, lot.groups
                )

                app_logger.debug(
                    "Lote processado",
                    extra={
                        "lot_name": lot_name,
                        "files_moved": len(lot.files),
                    },
                )

            app_logger.info(
                "Organização de lotes concluída",
                extra={
                    "lots_created": len(output_lots),
                    "files_moved": files_moved_count,
                },
            )

            return OrganizationResult(
                lots_created=len(output_lots),
                files_moved=files_moved_count,
                success=True,
                message=f"Criados {len(output_lots)} lotes com {files_moved_count} arquivos",
            )

        except Exception as e:
            app_logger.error(
                "Falha na organização",
                extra={"error": str(e), "error_type": type(e).__name__},
                exc_info=True,
            )
            return OrganizationResult(
                lots_created=0,
                files_moved=0,
                success=False,
                message=f"Erro na organização: {str(e)}",
            )
