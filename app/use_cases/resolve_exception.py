"""
UC-02: Resolver Arquivo Não Reconhecido.
Tenta extrair código de arquivo não identificado usando algoritmos de IA/Regex.
"""

import re
from typing import List

from app.core.interfaces import (CodeNotInManifestError, ExtractionFailedError,
                                 ICodeExtractor, IContentExtractor,
                                 IFileSystemManager)
from app.core.logger import app_logger
from app.domain.entities import DocumentFile, DocumentStatus, ManifestItem
from app.domain.file_naming import get_filename_with_revision


class ResolveExceptionUseCase:
    """Implementa o Caso de Uso UC-02: Resolver Arquivo Não Reconhecido."""

    def __init__(
        self,
        content_extractor: IContentExtractor,
        code_extractor: ICodeExtractor,
        file_manager: IFileSystemManager,
    ):
        """
        Inicializa com serviços de extração e gerenciador de arquivos.
        """
        self._content_extractor = content_extractor
        self._code_extractor = code_extractor
        self._file_manager = file_manager

    def _sanitize_code(self, code: str) -> str:
        """
        Limpa um código extraído para corresponder ao padrão do manifesto.
        """
        # Remove sufixos de revisão (ex: _A, _0, etc.)
        sanitized = re.sub(r"_[A-Z0-9]$", "", code, flags=re.IGNORECASE)
        return sanitized.strip()

    async def execute(
        self,
        file_to_resolve: DocumentFile,
        profile_id: str,
        all_manifest_items: List[ManifestItem],
    ) -> DocumentFile:
        """
        Executa o fluxo de resolução para um único arquivo.

        Args:
            file_to_resolve: O arquivo que falhou na validação inicial
            profile_id: ID do perfil de extração (ex: 'RIR', 'PID')
            all_manifest_items: Lista completa do manifesto para busca

        Returns:
            O arquivo atualizado com status VALIDATED e manifest_item associado

        Raises:
            ExtractionFailedError: Se não encontrar código
            CodeNotInManifestError: Se detectar código mas não estiver no manifesto
        """
        try:
            app_logger.info(
                "Iniciando resolução de exceção",
                extra={
                    "document_filename": file_to_resolve.path.name,
                    "profile_id": profile_id,
                },
            )

            # 1. Extração de Conteúdo (IO Bound - Async)
            text = await self._content_extractor.extract_text(file_to_resolve)

            # 2. Extração de Código (CPU Bound - pode ser síncrono ou async, assumindo async pela interface)
            found_code = await self._code_extractor.find_code(text, profile_id)

            if not found_code:
                app_logger.warning("Nenhum código encontrado no arquivo")
                raise ExtractionFailedError(
                    f"Nenhum código encontrado no arquivo '{file_to_resolve.path.name}' "
                    f"usando o perfil '{profile_id}'."
                )

            # 3. Limpeza
            sanitized_code = self._sanitize_code(found_code)

            # 4. Busca no Manifesto
            manifest_map = {item.document_code: item for item in all_manifest_items}
            matched_item = manifest_map.get(sanitized_code)

            if not matched_item:
                app_logger.warning(
                    "Código encontrado mas não consta no manifesto",
                    extra={"code": sanitized_code},
                )
                raise CodeNotInManifestError(
                    f"O código '{sanitized_code}' foi encontrado, "
                    f"mas não existe no manifesto."
                )

            # 5. Atualização do Arquivo
            file_to_resolve.status = DocumentStatus.VALIDATED
            file_to_resolve.associated_manifest_item = matched_item

            # 6. Renomeação Física
            expected_name = get_filename_with_revision(
                matched_item.document_code + file_to_resolve.path.suffix,
                matched_item.revision,
            )
            new_path = await self._file_manager.rename_file(
                file_to_resolve.path, expected_name
            )
            file_to_resolve.path = new_path

            app_logger.info(
                "Arquivo resolvido com sucesso",
                extra={
                    "code": sanitized_code,
                    "new_path": str(new_path),
                },
            )

            return file_to_resolve

        except Exception as e:
            app_logger.error(
                "Erro na resolução de exceção",
                extra={"error": str(e), "error_type": type(e).__name__},
                exc_info=True,
            )
            # Re-raise se for erro de negócio conhecido, senão wrap ou log
            raise
