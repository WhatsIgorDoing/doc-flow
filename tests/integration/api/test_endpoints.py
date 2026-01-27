"""
Testes para os endpoints da API REST.
"""

import pytest
from fastapi.testclient import TestClient
from pathlib import Path

from app.main_wave1 import app

client = TestClient(app)


def test_health_check():
    """Testa o endpoint de health check."""
    response = client.get("/api/health")
    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data


def test_validate_endpoint_missing_fields():
    """Testa validação com campos faltando."""
    response = client.post("/api/validate", json={})
    assert response.status_code == 422  # Validation error


def test_validate_endpoint_invalid_path():
    """Testa validação com caminho inválido."""
    response = client.post(
        "/api/validate",
        json={
            "manifest_path": "/path/that/does/not/exist.xlsx",
            "source_directory": "/another/invalid/path",
        },
    )
    assert response.status_code == 422  # Validation error (path não existe)


@pytest.mark.asyncio
async def test_organization_endpoint_not_implemented():
    """Testa que endpoint de organização retorna 501 (não implementado)."""
    response = client.post(
        "/api/organize",
        json={
            "validated_files": [],
            "output_directory": "/tmp/output",
            "max_docs_per_lot": 100,
        },
    )
    assert response.status_code == 501  # Not implemented
