import re
from pathlib import Path
from typing import Dict, List, Tuple

from ..domain import DocumentFile, DocumentStatus, ManifestItem
from ..interfaces import IFileRepository, IManifestRepository


class ValidateBatchUseCase:
    """
    Implementa o Caso de Uso UC-01: Validar Lote de Documentos.
    Orquestra os repositórios para comparar arquivos no disco com um manifesto.
    """

    # Padrões de sufixos de revisão típicos (RN-NEW-001) pre-compilados para performance
    _REVISION_PATTERNS = [
        re.compile(r"_[A-Z]$", re.IGNORECASE),  # _A, _B, _C, etc.
        re.compile(r"_Rev\d+$", re.IGNORECASE),  # _Rev0, _Rev1, _Rev2, etc.
        re.compile(r"_rev\d+$", re.IGNORECASE),  # _rev0, _rev1, _rev2, etc.
        re.compile(r"_\d+$", re.IGNORECASE),  # _0, _1, _2, etc.
        re.compile(r"_final$", re.IGNORECASE),  # _final
        re.compile(r"_temp$", re.IGNORECASE),  # _temp
        re.compile(r"_old$", re.IGNORECASE),  # _old
        re.compile(r"_backup$", re.IGNORECASE),  # _backup
        re.compile(r"_draft$", re.IGNORECASE),  # _draft
        re.compile(r"_preliminary$", re.IGNORECASE),  # _preliminary
    ]

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
        """
        name_without_ext = Path(file_name).stem

        # Verifica se há um sufixo de revisão no final usando padrões pré-compilados
        for pattern in self._REVISION_PATTERNS:
            if pattern.search(name_without_ext):
                # Remove o sufixo encontrado
                return pattern.sub("", name_without_ext)

        # Se não encontrou nenhum sufixo conhecido, retorna o nome completo
        return name_without_ext

    def execute(
        self, manifest_path: Path, source_directory: Path
    ) -> Tuple[List[DocumentFile], List[DocumentFile]]:
        """
        Executa o fluxo principal do caso de uso.
        """
        # 1. Carrega os dados do manifesto e do sistema de arquivos
        manifest_items = self._manifest_repo.load_from_file(manifest_path)
        disk_files = self._file_repo.list_files(source_directory)

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

        return validated_files, unrecognized_files
