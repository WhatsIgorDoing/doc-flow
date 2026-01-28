"""
API REST endpoints para SAD App v2.
Implementa rotas FastAPI para os Use Cases refatorados.
"""

from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field, field_validator

from app.core.logger import app_logger
from app.domain.exceptions import SADError
from app.infrastructure.repositories import (
    FileRepository,
    FileSystemManager,
    ManifestRepository,
)
from app.services.organization_service import OrganizationService
from app.services.validation_service import ValidationService

# Router para endpoints de documentos
router = APIRouter(prefix="/api", tags=["documents"])


# === Request/Response Models ===


class ValidationRequest(BaseModel):
    """Request para validação de lote."""

    manifest_path: str = Field(
        ..., description="Caminho absoluto do arquivo de manifesto Excel"
    )
    source_directory: str = Field(
        ..., description="Caminho absoluto do diretório com arquivos a validar"
    )

    @field_validator("manifest_path", "source_directory")
    @classmethod
    def validate_path_exists(cls, v: str) -> str:
        """Valida que o caminho existe."""
        path = Path(v)
        if not path.exists():
            raise ValueError(f"Path does not exist: {v}")
        return v


class ValidationResponse(BaseModel):
    """Response da validação de lote."""

    success: bool
    message: str
    validated_count: int
    unrecognized_count: int
    validated_files: List[str] = Field(
        default_factory=list, description="Lista de arquivos validados"
    )
    unrecognized_files: List[str] = Field(
        default_factory=list, description="Lista de arquivos não reconhecidos"
    )


class OrganizationRequest(BaseModel):
    """Request para organização de lotes."""

    validated_files: List[str] = Field(
        default_factory=list, description="Lista de caminhos (opcional se usando sessão)"
    )
    output_directory: str = Field(..., description="Diretório de saída para os lotes")
    max_docs_per_lot: int = Field(
        default=100, ge=1, le=1000, description="Máximo de documentos por lote"
    )
    start_sequence_number: int = Field(
        default=1, ge=1, description="Número inicial da sequência de lotes"
    )
    lot_name_pattern: str = Field(
        default="LOT_XXXX", description="Padrão de nome do lote (XXXX = sequência)"
    )


class OrganizationResponse(BaseModel):
    """Response da organização de lotes."""

    success: bool
    message: str
    lots_created: int
    files_moved: int


class HealthResponse(BaseModel):
    """Response do health check."""

    status: str
    version: str
    environment: str


# === Dependency Injection Helpers ===


from app.infrastructure.database import db_manager


def get_validation_service() -> ValidationService:
    """Factory para criar ValidationService com dependências."""
    manifest_repo = ManifestRepository()
    file_repo = FileRepository()
    return ValidationService(
        manifest_repo=manifest_repo, file_repo=file_repo, db_manager=db_manager
    )


def get_organization_service() -> OrganizationService:
    """Factory para criar OrganizationService com dependências."""
    file_manager = FileSystemManager()
    return OrganizationService(file_manager=file_manager, db_manager=db_manager)


# === Endpoints ===


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint.

    Returns:
        Status da aplicação
    """
    from app.core.config import settings

    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.post(
    "/validate",
    response_model=ValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate document batch",
    description="Validates a batch of documents against a manifest file",
)
async def validate_batch(request: ValidationRequest):
    """
    Valida um lote de documentos contra um manifesto Excel.

    Args:
        request: Dados da requisição com caminhos do manifesto e diretório

    Returns:
        ValidationResponse com resultado da validação

    Raises:
        HTTPException: 400 se houver erro de validação
        HTTPException: 500 se houver erro interno
    """
    try:
        app_logger.info(
            "Validation request received",
            extra={
                "manifest_path": request.manifest_path,
                "source_directory": request.source_directory,
            },
        )

        # Cria service com dependências
        service = get_validation_service()

        # Executa validação
        result = await service.validate_batch(
            manifest_path=Path(request.manifest_path),
            source_directory=Path(request.source_directory),
        )

        # Converte resultado para response
        return ValidationResponse(
            success=result.success,
            message=result.message,
            validated_count=result.validated_count,
            unrecognized_count=result.unrecognized_count,
            validated_files=[str(f.path) for f in result.validated_files],
            unrecognized_files=[str(f.path) for f in result.unrecognized_files],
        )

    except SADError as e:
        app_logger.warning(
            "Validation failed",
            extra={"error": str(e), "error_type": type(e).__name__},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e), "type": type(e).__name__},
        )
    except Exception as e:
        app_logger.error(
            "Internal error during validation",
            extra={"error": str(e), "error_type": type(e).__name__},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": str(e)},
        )


@router.post(
    "/organize",
    response_model=OrganizationResponse,
    status_code=status.HTTP_200_OK,
    summary="Organize documents into lots",
    description="Organizes validated documents into balanced output lots",
)
async def organize_lots(request: OrganizationRequest):
    """
    Organiza documentos validados em lotes balanceados.

    Args:
        request: Dados da requisição com configurações de organização

    Returns:
        OrganizationResponse com resultado da organização

    Raises:
        HTTPException: 400 se houver erro de organização
        HTTPException: 500 se houver erro interno
    """
    try:
        app_logger.info(
            "Organization request received",
            extra={
                "files_count": len(request.validated_files),
                "output_directory": request.output_directory,
                "max_docs_per_lot": request.max_docs_per_lot,
            },
        )

        # Reconstruir DocumentFile objects não é mais necessário aqui
        # pois o service busca do banco de dados da sessão.
        
        service = get_organization_service()
        
        # Validar se diretório de saída existe ou criar
        output_dir = Path(request.output_directory)
        if not output_dir.exists():
            # Tentar criar? O ideal é o usuario criar, mas podemos tentar
             try:
                 output_dir.mkdir(parents=True, exist_ok=True)
             except Exception:
                 pass # Service vai lidar ou dar erro

        result = await service.organize_session_lots(
            output_directory=output_dir,
            max_docs_per_lot=request.max_docs_per_lot,
            start_sequence_number=request.start_sequence_number,
            lot_name_pattern=request.lot_name_pattern,
        )

        return OrganizationResponse(
            success=result.success,
            message=result.message,
            lots_created=result.lots_created,
            files_moved=result.files_moved,
        )

    except HTTPException:
        raise
    except SADError as e:
        app_logger.warning(
            "Organization failed",
            extra={"error": str(e), "error_type": type(e).__name__},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": str(e), "type": type(e).__name__},
        )
    except Exception as e:
        app_logger.error(
            "Internal error during organization",
            extra={"error": str(e), "error_type": type(e).__name__},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "Internal server error", "message": str(e)},
        )
