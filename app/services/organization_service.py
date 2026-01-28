from pathlib import Path
from typing import Dict, List

from app.core.logger import app_logger
from app.domain.entities import (
    DocumentFile,
    OrganizationResult,
)
from app.domain.exceptions import OrganizationError
from app.infrastructure.repositories import FileSystemManager
from app.infrastructure.services import GreedyLotBalancerService
from app.infrastructure.template_filler import OpenpyxlTemplateFiller
from app.use_cases.organize_lots import OrganizeLotsUseCase


class OrganizationService:
    """
    Service para organização e geração de lotes de saída.
    Atua como fachada para o OrganizeLotsUseCase.
    """

    def __init__(self, file_manager: FileSystemManager):
        """
        Inicializa o service, compondo as dependências necessárias para o Use Case.
        """
        self._file_manager = file_manager
        
        # Instanciando dependências adicionais aqui para manter compatibilidade
        # com a assinatura atual do construtor que é usada pelo endpoint
        self._balancer = GreedyLotBalancerService()
        self._template_filler = OpenpyxlTemplateFiller(file_manager)
        
        self._use_case = OrganizeLotsUseCase(
            balancer=self._balancer,
            file_manager=self._file_manager,
            template_filler=self._template_filler
        )

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

