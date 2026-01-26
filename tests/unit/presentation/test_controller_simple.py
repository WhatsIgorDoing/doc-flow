from pathlib import Path
from unittest.mock import MagicMock

from src.sad_app_v2.presentation.controller import MainController


class TestMainControllerSimple:
    """
    Testes simplificados para o MainController.
    """

    def setup_method(self):
        """
        Configura mocks para cada teste.
        """
        # Mock da view
        self.mock_view = MagicMock()

        # Mock dos widgets da view
        self.mock_view.manifest_button = MagicMock()
        self.mock_view.source_dir_button = MagicMock()
        self.mock_view.validate_button = MagicMock()
        self.mock_view.manifest_entry = MagicMock()
        self.mock_view.source_dir_entry = MagicMock()
        self.mock_view.validated_label = MagicMock()
        self.mock_view.unrecognized_label = MagicMock()
        self.mock_view.validated_list = MagicMock()
        self.mock_view.unrecognized_list = MagicMock()
        self.mock_view.progress_bar = MagicMock()
        self.mock_view.log_textbox = MagicMock()
        self.mock_view.after = MagicMock()

    def test_controller_initialization(self):
        """
        Testa se o controller é inicializado corretamente.
        """
        controller = MainController(self.mock_view)

        # Verifica se as dependências foram configuradas
        assert controller.view == self.mock_view
        assert controller.manifest_repository is not None
        assert controller.file_repository is not None
        assert controller.validate_batch_use_case is not None

        # Verifica se os eventos foram conectados
        assert controller.view.manifest_button.configure.called
        assert controller.view.source_dir_button.configure.called
        assert controller.view.validate_button.configure.called

    def test_update_validate_button_state(self):
        """
        Testa a atualização do estado do botão de validação.
        """
        controller = MainController(self.mock_view)

        # Sem arquivos selecionados - botão deve estar desabilitado
        controller._update_validate_button_state()
        controller.view.validate_button.configure.assert_called_with(state="disabled")

        # Com manifesto mas sem diretório - botão deve estar desabilitado
        controller.manifest_path = Path("test.xlsx")
        controller._update_validate_button_state()
        controller.view.validate_button.configure.assert_called_with(state="disabled")

        # Com ambos selecionados - botão deve estar habilitado
        controller.source_directory = Path("test_dir")
        controller._update_validate_button_state()
        controller.view.validate_button.configure.assert_called_with(state="normal")

    def test_clear_results(self):
        """
        Testa a limpeza dos resultados.
        """
        controller = MainController(self.mock_view)

        # Executa limpeza
        controller.clear_results()

        # Verifica se as listas foram limpadas
        assert controller.view.validated_list.delete.called
        assert controller.view.unrecognized_list.delete.called

        # Verifica se os contadores foram resetados
        controller.view.validated_label.configure.assert_called()
        controller.view.unrecognized_label.configure.assert_called()

        # Verifica se o progresso foi resetado
        controller.view.progress_bar.set.assert_called_with(0)

        # Verifica se o estado foi limpo
        assert controller.last_validation_result is None
