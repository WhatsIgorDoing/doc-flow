from pathlib import Path
from typing import List

from app.core.logger import app_logger
from app.domain.entities import (
    DocumentFile,
    DocumentStatus,
    ManifestItem,
    OrganizationResult,
)
from app.domain.exceptions import OrganizationError
from app.infrastructure.repositories import FileSystemManager
from app.infrastructure.services import GreedyLotBalancerService
from app.infrastructure.template_filler import OpenpyxlTemplateFiller
from app.infrastructure.database import DatabaseManager
from app.use_cases.organize_lots import OrganizeLotsUseCase


class OrganizationService:
    """
    Service para organização e geração de lotes de saída.
    Atua como fachada para o OrganizeLotsUseCase.
    """

    def __init__(self, file_manager: FileSystemManager, db_manager: DatabaseManager):
        """
        Inicializa o service, compondo as dependências necessárias para o Use Case.
        """
        self._file_manager = file_manager
        self._db_manager = db_manager

        # Instanciando dependências adicionais aqui para manter compatibilidade
        # com a assinatura atual do construtor que é usada pelo endpoint
        self._balancer = GreedyLotBalancerService()
        self._template_filler = OpenpyxlTemplateFiller(file_manager)

        self._use_case = OrganizeLotsUseCase(
            balancer=self._balancer,
            file_manager=self._file_manager,
            template_filler=self._template_filler,
        )

    async def organize_session_lots(
        self,
        output_directory: Path,
        max_docs_per_lot: int,
        start_sequence_number: int,
        lot_name_pattern: str,
        master_template_path: Path = Path("templates/manifest_template.xlsx"),
    ) -> OrganizationResult:
        """
        Organiza documentos validados da sessão atual em lotes.
        """
        # 1. Recuperar Docs do Banco
        validated_docs_db = self._db_manager.get_validated_documents(
            self._db_manager.session_id
        )

        if not validated_docs_db:
            raise OrganizationError("No validated documents found in current session.")

        # 2. Converter para Entidades de Domínio (DocumentFile)
        validated_files = []
        for v_doc in validated_docs_db:
            doc = DocumentFile(
                path=Path(v_doc.path),
                size_bytes=v_doc.size_bytes,
                status=(
                    DocumentStatus(v_doc.status)
                    if v_doc.status
                    else DocumentStatus.UNVALIDATED
                ),
            )
            # Reconstruir ManifestItem se disponível
            if v_doc.document_code:
                doc.associated_manifest_item = ManifestItem(
                    document_code=v_doc.document_code,
                    revision=v_doc.revision or "",
                    title=v_doc.title or "",
                )
            validated_files.append(doc)

        # 3. Delegar para Use Case
        try:
            return await self._use_case.execute(
                validated_files=validated_files,
                output_directory=output_directory,
                master_template_path=master_template_path,
                max_docs_per_lot=max_docs_per_lot,
                start_sequence_number=start_sequence_number,
                lot_name_pattern=lot_name_pattern,
            )
        except Exception as e:
            raise OrganizationError(f"Organization failed: {e}")

    async def organize_and_generate_lots(
        self,
        validated_files: List[DocumentFile],
        output_directory: Path,
        max_docs_per_lot: int,
        start_sequence_number: int,
        lot_name_pattern: str,
        master_template_path: Path = Path("templates/manifest_template.xlsx"),
    ) -> OrganizationResult:
        """
        Organiza arquivos validados em lotes e move para diretório de saída.
        Delaga para o Use Case.
        """
        try:
            return await self._use_case.execute(
                validated_files=validated_files,
                output_directory=output_directory,
                master_template_path=master_template_path,
                max_docs_per_lot=max_docs_per_lot,
                start_sequence_number=start_sequence_number,
                lot_name_pattern=lot_name_pattern,
            )
        except Exception as e:
            # O use case já loga erros, service faz wrap para exceção de domínio esperada pela API
            raise OrganizationError(f"Organization failed: {e}")
