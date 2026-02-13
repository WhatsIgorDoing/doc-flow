from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.endpoints import get_organization_service, get_validation_service
from app.domain.entities import (
    DocumentFile,
    DocumentStatus,
    ManifestItem,
    OrganizationResult,
    ValidationResult,
)
from app.main import app

client = TestClient(app)


def test_health_check():
    """Testa endpoint de health check."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@patch("pathlib.Path.exists", return_value=True)
@patch("app.api.endpoints.get_validation_service")
def test_validate_batch_success(mock_get_service, mock_exists):
    """Testa validação com sucesso (200 OK)."""
    # Configurar Mock do Service
    mock_service = MagicMock()
    mock_get_service.return_value = mock_service

    valid_file = DocumentFile(path="c:/test/doc1.pdf", size_bytes=100)
    valid_file.status = DocumentStatus.VALIDATED
    valid_file.associated_manifest_item = ManifestItem("DOC1", "0", "Title")

    result = ValidationResult(
        success=True,
        message="OK",
        validated_count=1,
        unrecognized_count=0,
        validated_files=[valid_file],
        unrecognized_files=[],
    )

    mock_service.validate_batch = AsyncMock(return_value=result)

    payload = {
        "manifest_path": "c:/data/manifest.xlsx",
        "source_directory": "c:/data/docs",
    }

    # O patch de Path.exists garante que o validator do Pydantic passe
    response = client.post("/api/validate", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["validated_count"] == 1


@patch("pathlib.Path.exists", return_value=False)
def test_validate_batch_invalid_path(mock_exists):
    """Testa validação com caminhos inexistentes (422 Unprocessable Entity do Pydantic)."""
    payload = {
        "manifest_path": "c:/ghost/manifest.xlsx",
        "source_directory": "c:/ghost/docs",
    }

    response = client.post("/api/validate", json=payload)

    assert response.status_code == 422


@patch("app.api.endpoints.get_organization_service")
def test_organize_lots_success(mock_get_service):
    """Testa endpoint de organização com sucesso (200 OK)."""
    # Configurar Mock do Service
    mock_service = MagicMock()
    mock_get_service.return_value = mock_service

    result = OrganizationResult(
        success=True, message="Lotes criados", lots_created=1, files_moved=10
    )
    mock_service.organize_session_lots = AsyncMock(return_value=result)

    payload = {
        "validated_files": ["c:/doc1.pdf"],
        "output_directory": "c:/output",
        "max_docs_per_lot": 100,
    }

    # Deve mockar Path.exists para o output_directory se o endpoint verificar
    # O endpoint verifica: if not output_dir.exists(): try mkdir.
    # Podemos mockar Path.exists ou deixar falhar silenciosamente (warning logged)
    # Como mockamos o service, o endpoint vai chamar o service de qualquer jeito.

    with patch("pathlib.Path.exists", return_value=True):
        response = client.post("/api/organize", json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["lots_created"] == 1
