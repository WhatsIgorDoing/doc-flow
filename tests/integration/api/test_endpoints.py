from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.api.endpoints import get_organization_service, get_validation_service
from app.domain.entities import (DocumentFile, DocumentStatus, ManifestItem,
                                 ValidationResult)
from app.main import app

client = TestClient(app)

# Mocks Globais
mock_validation_service = MagicMock()
mock_organization_service = MagicMock()


def override_get_validation_service():
    return mock_validation_service


def override_get_organization_service():
    return mock_organization_service


app.dependency_overrides[get_validation_service] = override_get_validation_service
app.dependency_overrides[get_organization_service] = override_get_organization_service


def test_health_check():
    """Testa endpoint de health check."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@patch("pathlib.Path.exists", return_value=True)
def test_validate_batch_success(mock_exists):
    """Testa validação com sucesso (200 OK)."""
    # Configurar AsyncMock para o método chamado pelo endpoint
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

    # Importante: O endpoint faz 'await service.validate_batch()'
    # Portanto, validate_batch deve ser um AsyncMock que retorna o result
    mock_validation_service.validate_batch = AsyncMock(return_value=result)

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


def test_validate_batch_invalid_path():
    """Testa validação com caminhos inexistentes (422 Unprocessable Entity do Pydantic)."""
    # Não mockamos exists aqui (ou mockamos como False se precisasse, mas o default é real IO)
    # Como os caminhos não existem na maquina de teste, o validator deve falhar.

    # Mas cuidado: Se algum outro teste mockou pathlib globally e não limpou...
    # O patch decorator limpa.

    payload = {
        "manifest_path": "c:/ghost/manifest.xlsx",
        "source_directory": "c:/ghost/docs",
    }

    # precisamos garantir que exists retorne False.
    # Se rodar em ambiente onde paths nao existem, ok.
    # Mas para ser deterministico, melhor mockar False.
    with patch("pathlib.Path.exists", return_value=False):
        response = client.post("/api/validate", json=payload)

    assert response.status_code == 422


def test_organize_lots_not_implemented():
    """Testa endpoint de organização (atualmente 501)."""
    payload = {
        "validated_files": ["c:/doc1.pdf"],
        "output_directory": "c:/output",
        "max_docs_per_lot": 100,
    }

    response = client.post("/api/organize", json=payload)

    assert response.status_code == 501
