import re
from typing import Dict, List

from ..domain import DocumentFile, ManifestItem, DocumentStatus
from ..interfaces import (
    IContentExtractor,
    ICodeExtractor,
    ExtractionFailedError,
    CodeNotInManifestError,
)


class ResolveUnrecognizedFileUseCase:
    """
    Implementa o Caso de Uso UC-02: Resolver Arquivo Não Reconhecido.
    """

    def __init__(
        self,
        content_extractor: IContentExtractor,
        code_extractor: ICodeExtractor
    ):
        """Inicializa o caso de uso com suas dependências de extração."""
        self._content_extractor = content_extractor
        self._code_extractor = code_extractor

    def _sanitize_code(self, code: str) -> str:
        """
        Limpa um código extraído para corresponder ao padrão do manifesto.
        Esta lógica deve ser mantida consistente com a validação.
        """
        # Remove sufixos de revisão (ex: _A, _0, etc.)
        sanitized = re.sub(r'_[A-Z0-9]$', '', code, flags=re.IGNORECASE)
        return sanitized.strip()

    def execute(
        self,
        file_to_resolve: DocumentFile,
        profile_id: str,
        all_manifest_items: List[ManifestItem]
    ) -> DocumentFile:
        """
        Executa o fluxo de resolução para um único arquivo.
        """
        # 1. Extrai o conteúdo de texto do arquivo
        text = self._content_extractor.extract_text(file_to_resolve, profile_id)

        # 2. Extrai o código do texto usando o perfil
        found_code = self._code_extractor.find_code(text, profile_id)

        if not found_code:
            raise ExtractionFailedError(
                f"Nenhum código encontrado no arquivo '{file_to_resolve.path.name}' "
                f"usando o perfil '{profile_id}'."
            )

        # 3. Limpa o código para correspondência
        sanitized_code = self._sanitize_code(found_code)

        # 4. Verifica se o código limpo existe no manifesto
        manifest_map: Dict[str, ManifestItem] = {
            item.document_code: item for item in all_manifest_items
        }

        matched_item = manifest_map.get(sanitized_code)

        if not matched_item:
            raise CodeNotInManifestError(
                f"O código '{sanitized_code}' foi encontrado, "
                f"mas não existe no manifesto."
            )

        # 5. Sucesso: Atualiza o arquivo e o retorna
        file_to_resolve.status = DocumentStatus.VALIDATED
        file_to_resolve.associated_manifest_item = matched_item

        return file_to_resolve
