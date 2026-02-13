"""
UC-01: Validar Lote de Documentos.
Compara arquivos no disco com um manifesto Excel.
"""

import re
from pathlib import Path
from typing import Dict, List

from app.core.interfaces import IFileRepository, IManifestRepository
from app.core.logger import app_logger
from app.domain.entities import (DocumentFile, DocumentStatus, ManifestItem,
                                 ValidationResult)


class ValidateBatchUseCase:
    """
    Implementa o Caso de Uso UC-01: Validar Lote de Documentos.
    Orquestra os repositórios para comparar arquivos no disco com um manifesto.
    """

    def __init__(self, manifest_repo: IManifestRepository, file_repo: IFileRepository):
        """
        Inicializa o caso de uso com as dependências (repositórios).
        Isso é Injeção de Dependência.
        """
        self._manifest_repo = manifest_repo
        self._file_repo = file_repo

    def _get_file_base_name(self, file_name: str) -> str:
        """
        Extrai o nome base de um arquivo para correspondência seguindo RN-NEW-001.
        Remove sufixos de revisão conhecidos, mas preserva underscores que fazem parte do nome.

        Exemplos:
        - 'CZ6_RNEST_U22_3.1.1.1_ELE_RIR_ELE-700-CHZ-247-FL04.pdf' -> 'CZ6_RNEST_U22_3.1.1.1_ELE_RIR_ELE-700-CHZ-247-FL04'
        - 'CZ6_RNEST_U22_3.1.1.1_ELE_RIR_ELE-700-CHZ-247-FL04_A.pdf' -> 'CZ6_RNEST_U22_3.1.1.1_ELE_RIR_ELE-700-CHZ-247-FL04'
        - 'DOC-123_Rev0.pdf' -> 'DOC-123'
        - 'DOC-123.pdf' -> 'DOC-123'
        """
        name_without_ext = Path(file_name).stem

        # Padrões de sufixos de revisão típicos
        revision_patterns = [
            r"_[A-Z]$",  # _A, _B, _C, etc.
            r"_Rev\d+$",  # _Rev0, _Rev1, _Rev2, etc.
            r"_rev\d+$",  # _rev0, _rev1, _rev2, etc.
            r"_\d+$",  # _0, _1, _2, etc.
            r"_final$",  # _final
            r"_temp$",  # _temp
            r"_old$",  # _old
            r"_backup$",  # _backup
            r"_draft$",  # _draft
            r"_preliminary$",  # _preliminary
        ]

        # Verifica se há um sufixo de revisão no final
        for pattern in revision_patterns:
            if re.search(pattern, name_without_ext, re.IGNORECASE):
                # Remove o sufixo encontrado
                return re.sub(pattern, "", name_without_ext, flags=re.IGNORECASE)

        # Se não encontrou nenhum sufixo conhecido, retorna o nome completo
        return name_without_ext

    async def execute(
        self, manifest_path: Path, source_directory: Path
    ) -> ValidationResult:
        """
        Executa o fluxo principal do caso de uso.

        Args:
            manifest_path: Caminho do arquivo de manifesto Excel
            source_directory: Diretório com os arquivos a validar

        Returns:
            ValidationResult com arquivos validados e não reconhecidos

        Raises:
            ManifestReadError: Se houver erro ao ler o manifesto
            SourceDirectoryNotFoundError: Se o diretório não existir
        """
        try:
            app_logger.info(
                "Iniciando validação de lote",
                extra={
                    "manifest_path": str(manifest_path),
                    "source_directory": str(source_directory),
                },
            )

            # 1. Carrega os dados do manifesto e do sistema de arquivos
            manifest_items = await self._manifest_repo.load_from_file(manifest_path)
            disk_files = await self._file_repo.list_files(source_directory)

            app_logger.debug(
                "Dados carregados",
                extra={
                    "manifest_items": len(manifest_items),
                    "disk_files": len(disk_files),
                },
            )

            # 2. Cria um dicionário para busca rápida dos itens do manifesto
            manifest_map: Dict[str, ManifestItem] = {
                item.document_code: item for item in manifest_items
            }

            # 3. Inicializa as listas de resultado
            validated_files: List[DocumentFile] = []
            unrecognized_files: List[DocumentFile] = []

            # 4. Itera sobre os arquivos do disco para validação
            for file in disk_files:
                base_name = self._get_file_base_name(file.path.name)

                # 5. Tenta encontrar a correspondência no manifesto
                matched_item = manifest_map.get(base_name)

                if matched_item:
                    # Sucesso: A correspondência foi encontrada
                    file.status = DocumentStatus.VALIDATED
                    file.associated_manifest_item = matched_item
                    validated_files.append(file)
                else:
                    # Falha: Nenhuma correspondência encontrada
                    file.status = DocumentStatus.UNRECOGNIZED
                    unrecognized_files.append(file)

            app_logger.info(
                "Validação de lote concluída",
                extra={
                    "validated_count": len(validated_files),
                    "unrecognized_count": len(unrecognized_files),
                },
            )

            return ValidationResult(
                validated_count=len(validated_files),
                unrecognized_count=len(unrecognized_files),
                validated_files=validated_files,
                unrecognized_files=unrecognized_files,
                success=True,
                message=f"Validados {len(validated_files)} arquivos, {len(unrecognized_files)} não reconhecidos",
            )

        except Exception as e:
            app_logger.error(
                "Falha na validação",
                extra={"error": str(e), "error_type": type(e).__name__},
                exc_info=True,
            )
            return ValidationResult(
                validated_count=0,
                unrecognized_count=0,
                success=False,
                message=f"Erro na validação: {str(e)}",
            )
