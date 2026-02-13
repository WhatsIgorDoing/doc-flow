import pytest
import sys
from unittest.mock import MagicMock, AsyncMock
from pathlib import Path
import inspect

# Adiciona o diretório src ao PYTHONPATH para encontrar sad_app_v2
sys.path.append("src")

from sad_app_v2.presentation.controller import Controller
from app.use_cases.validate_batch import ValidateBatchUseCase
from app.infrastructure.repositories import ManifestRepository, FileRepository
from app.domain.entities import ValidationResult

@pytest.mark.asyncio
async def test_controller_integration_success():
    """
    Testa a integração do Controller com o Use Case.
    Verifica se o Controller chama o Use Case corretamente.

    Este teste DEVE PASSAR agora que o Controller foi corrigido.
    """
    # 1. Mocks de Repositório (camada de infraestrutura)
    mock_manifest_repo = MagicMock(spec=ManifestRepository)
    mock_file_repo = MagicMock(spec=FileRepository)

    # Simula um retorno mínimo para evitar falhas dentro do use case
    mock_manifest_repo.load_from_file = AsyncMock(return_value=[])
    mock_file_repo.list_files = AsyncMock(return_value=[])

    # 2. Use Case REAL (camada de domínio/aplicação)
    # Usamos o Use Case real para validar a chamada
    use_case = ValidateBatchUseCase(mock_manifest_repo, mock_file_repo)

    # 3. Mock da View (camada de apresentação)
    mock_view = MagicMock()
    mock_view.progress_bar = MagicMock()
    mock_view.after = MagicMock()

    # 4. Instancia Controller
    controller = Controller(use_case, mock_view)

    # Simula caminhos de entrada
    controller.manifest_path = Path("/test/manifest.xlsx")
    controller.source_directory = Path("/test/docs")

    # 5. Executa a ação do Controller (agora async)
    # Isso deve funcionar sem erro de TypeError
    await controller.start_validation()

    # 6. Verificações

    # Verifica interação com a View
    mock_view.progress_bar.set.assert_called_with(0.8)

    mock_view.after.assert_called_once()
    # Verifica argumentos passados para o after
    args = mock_view.after.call_args[0]
    result_passed = args[2] # (delay, callback, result)

    # O resultado deve ser validado (instância de ValidationResult)
    assert isinstance(result_passed, ValidationResult), "O resultado deve ser uma instância de ValidationResult"
    assert not inspect.iscoroutine(result_passed), "O resultado não deve ser uma coroutine"
