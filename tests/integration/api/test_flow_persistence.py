import pytest
import uuid
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi.testclient import TestClient
from pathlib import Path

from app.main import app
from app.api.endpoints import get_validation_service, get_organization_service
from app.services.validation_service import ValidationService
from app.services.organization_service import OrganizationService
from app.infrastructure.database import db_manager, DatabaseManager
from app.domain.entities import ValidationResult, DocumentFile, DocumentStatus, OrganizationResult

# Test Client
client = TestClient(app)

@pytest.fixture
def test_db_manager(tmp_path):
    # Setup isolado do DB para este teste de integração
    from app.core.config import settings
    test_db = tmp_path / "integration_test.db"
    
    # Patch settings.get_database_path GLOBALMENTE para que app/db_manager use este caminho
    # Precisamos reload do module ou monkeypatch na instância existente?
    # O db_manager já foi instanciado. Precisamos reinicializar engine.
    
    db_manager.engine.dispose()
    from sqlmodel import create_engine
    db_manager.engine = create_engine(f"sqlite:///{test_db}")
    db_manager.init_db()
    
    # Set session id (como faria o middleware/startup)
    db_manager.current_session_id = str(uuid.uuid4())
    
    yield db_manager
    
    db_manager.engine.dispose()


@patch("app.api.endpoints.get_validation_service")
@patch("app.api.endpoints.get_organization_service") 
def test_full_flow_validate_then_organize(
    mock_get_org_service, 
    mock_get_valid_service, 
    test_db_manager
):
    # NOTA: Em vez de mockar os services inteiros, vamos usar os services REAIS
    # mas mockar os repositórios DELES (IO).
    
    # 1. Setup Validation Service 
    mock_manifest_repo = MagicMock()
    mock_file_repo = MagicMock()
    
    real_validation_service = ValidationService(
        manifest_repo=mock_manifest_repo,
        file_repo=mock_file_repo,
        db_manager=test_db_manager
    )
    
    # Mock do Use Case interno para não depender de arquitetura de pastas real
    # Queremos testar: Endpoint -> Service -> DB -> Service -> Endpoint
    
    # Simulando resultado do UseCase
    valid_file = DocumentFile(Path("c:/docs/contract.pdf"), 1024, DocumentStatus.VALIDATED)
    valid_file.associated_manifest_item = MagicMock(document_code="DOC-1", revision="0", title="Contract")
    
    validation_result = ValidationResult(
        success=True, validated_count=1, validated_files=[valid_file]
    )
    
    # Patch do método execute do use case
    real_validation_service._Use_case.execute = AsyncMock(return_value=validation_result)
    
    mock_get_valid_service.return_value = real_validation_service

    # 2. Setup Organization Service
    mock_fs_manager = MagicMock()
    
    real_org_service = OrganizationService(
        file_manager=mock_fs_manager, 
        db_manager=test_db_manager
    )
    
    # Mock do Use Case de organização (para não mover arquivos de verdade)
    # Mas queremos garantir que ele recebeu os dados do banco!
    
    # Vamos mockar o método 'organize_session_lots' parcialmente? 
    # Não, queremos testar 'organize_session_lots' buscando do banco.
    # Vamos mockar o 'organize_and_generate_lots' (ou o use case execute)
    
    org_result = OrganizationResult(success=True, lots_created=1, files_moved=1)
    real_org_service._use_case.execute = AsyncMock(return_value=org_result)
    
    mock_get_org_service.return_value = real_org_service


    # === EXECUÇÃO ===
    
    # Passo 1: Validate Endpoint
    print("\n[TEST] Calling /api/validate")
    resp_val = client.post("/api/validate", json={
        "manifest_path": "c:/d/m.xlsx",
        "source_directory": "c:/d/docs"
    })
    assert resp_val.status_code == 200
    
    # Verificar se salvou no banco
    saved = test_db_manager.get_validated_documents(test_db_manager.session_id)
    assert len(saved) == 1
    assert saved[0].filename == "contract.pdf"
    print(f"[TEST] Persisted {len(saved)} docs in DB")

    # Passo 2: Organize Endpoint
    # Payload sem validated_files (opcional)
    print("[TEST] Calling /api/organize")
    resp_org = client.post("/api/organize", json={
        "output_directory": "c:/out",
        "max_docs_per_lot": 10
    })
    
    assert resp_org.status_code == 200
    data = resp_org.json()
    assert data["success"] is True
    
    # Verificar se o Use Case de organização foi chamado corretamente
    # E se os dados passados para ele vieram do banco
    real_org_service._use_case.execute.assert_called_once()
    
    call_args = real_org_service._use_case.execute.call_args
    validated_files_passed = call_args.kwargs['validated_files']
    
    assert len(validated_files_passed) == 1
    assert validated_files_passed[0].path == Path("c:/docs/contract.pdf")
    assert validated_files_passed[0].associated_manifest_item.document_code == "DOC-1"
    
    print("[TEST] Full flow verified!")
