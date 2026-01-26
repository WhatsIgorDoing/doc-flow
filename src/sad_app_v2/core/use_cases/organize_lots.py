from pathlib import Path
from typing import Dict, List

from ..domain import DocumentFile, DocumentGroup, OrganizationResult
from ..interfaces import (
    CoreError,
    IFileSystemManager,
    ILotBalancerService,
    ITemplateFiller,
)


def _get_filename_with_revision(original_filename: str, revision: str) -> str:
    """
    Constrói o nome do arquivo com a revisão adicionada antes da extensão.
    Verifica se a revisão já existe no nome para evitar duplicação.

    Exemplo:
    - "arquivo.pdf" + "A" -> "arquivo_A.pdf"
    - "arquivo_A.pdf" + "A" -> "arquivo_A.pdf" (não duplica)
    - "arquivo" + "B" -> "arquivo_B"
    """
    name_parts = original_filename.rsplit(".", 1)

    if len(name_parts) == 2:
        base_name, extension = name_parts
        # Verificar se já termina com _revisão
        if base_name.endswith(f"_{revision}"):
            # Já tem a revisão correta, retornar como está
            return original_filename
        else:
            # Adicionar a revisão
            return f"{base_name}_{revision}.{extension}"
    else:
        # Arquivo sem extensão
        if original_filename.endswith(f"_{revision}"):
            # Já tem a revisão correta, retornar como está
            return original_filename
        else:
            # Adicionar a revisão
            return f"{original_filename}_{revision}"


class OrganizeAndGenerateLotsUseCase:
    """Implementa o Caso de Uso UC-03: Organizar e Gerar Lotes de Saída."""

    def __init__(
        self,
        balancer: ILotBalancerService,
        file_manager: IFileSystemManager,
        template_filler: ITemplateFiller,
    ):
        self._balancer = balancer
        self._file_manager = file_manager
        self._template_filler = template_filler

    def execute(
        self,
        validated_files: List[DocumentFile],
        output_directory: Path,
        master_template_path: Path,
        max_docs_per_lot: int,
        start_sequence_number: int,
        lot_name_pattern: str,
    ) -> OrganizationResult:
        try:
            # 1. Agrupamento
            groups_map: Dict[str, DocumentGroup] = {}
            for file in validated_files:
                # Verificar se o arquivo tem um item do manifesto associado
                if file.associated_manifest_item is None:
                    # Para arquivos sem item do manifesto (ex: RIR sem correspondência),
                    # usar o nome base do arquivo como código de agrupamento
                    code = file.path.stem  # Nome do arquivo sem extensão
                else:
                    code = file.associated_manifest_item.document_code

                if code not in groups_map:
                    groups_map[code] = DocumentGroup(document_code=code)
                groups_map[code].files.append(file)

            groups = list(groups_map.values())

            # 2. Balanceamento
            output_lots = self._balancer.balance_lots(groups, max_docs_per_lot)

            files_moved_count = 0

            # 3. Loop de Execução (Nomenclatura, Movimentação, Preenchimento)
            for i, lot in enumerate(output_lots):
                seq_number = start_sequence_number + i
                lot_name = lot_name_pattern.replace("XXXX", f"{seq_number:04d}")

                lot_directory_path = output_directory / lot_name

                # 3a. Criação de Diretório
                self._file_manager.create_directory(lot_directory_path)

                # 3b. Movimentação dos Arquivos
                for group in lot.groups:
                    for file in group.files:
                        # Obter informações do manifesto
                        manifest_item = file.associated_manifest_item
                        revision = manifest_item.revision if manifest_item else "0"

                        # Construir novo nome do arquivo com revisão
                        new_filename = _get_filename_with_revision(
                            file.path.name, revision
                        )

                        destination_path = lot_directory_path / new_filename
                        self._file_manager.move_file(file.path, destination_path)
                        files_moved_count += 1

                # 3c. Preenchimento do Manifesto de Lote
                output_manifest_path = lot_directory_path / f"{lot_name}.xlsx"
                self._template_filler.fill_and_save(
                    master_template_path, output_manifest_path, lot.groups
                )

            return OrganizationResult(
                lots_created=len(output_lots),
                files_moved=files_moved_count,
            )

        except CoreError as e:
            # Se qualquer operação de infraestrutura falhar, retorna um resultado de erro.
            return OrganizationResult(success=False, message=str(e))
