from pathlib import Path
from unittest.mock import MagicMock, patch

from src.sad_app_v2.core.domain import (
    DocumentFile,
    DocumentGroup,
    DocumentStatus,
    ManifestItem,
)
from src.sad_app_v2.presentation.controller import MainController


class TestMainController:
    """
    Testes para o MainController.
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

    def test_log_message(self):
        """
        Testa o sistema de log.
        """
        controller = MainController(self.mock_view)

        # Testa log de mensagem simples
        with patch("datetime.datetime") as mock_datetime:
            mock_datetime.now.return_value.strftime.return_value = "12:00:00"

            controller._log_message("Teste de mensagem")

            # Verifica se o log foi atualizado
            assert controller.view.log_textbox.configure.called
            assert controller.view.log_textbox.insert.called
            assert controller.view.log_textbox.see.called

    @patch("src.sad_app_v2.presentation.controller.threading.Thread")
    def test_start_validation_with_missing_inputs(self, mock_thread):
        """
        Testa validação com inputs faltando.
        """
        controller = MainController(self.mock_view)

        # Testa sem manifesto e diretório
        controller._start_validation()

        # Verifica se não iniciou thread
        assert not mock_thread.called

        # Verifica se logou erro
        # (mock_datetime seria necessário para testar a mensagem exata)

    def test_update_results(self):
        """
        Testa a atualização dos resultados na interface.
        """
        controller = MainController(self.mock_view)

        # Cria dados de teste
        valid_doc = DocumentFile(
            path=Path("test1.pdf"),
            size_bytes=1024,
            status=DocumentStatus.VALIDATED,
            associated_manifest_item=ManifestItem(
                document_code="123", revision="v1", title="Test Document"
            ),
        )

        invalid_doc = DocumentFile(
            path=Path("test2.pdf"), size_bytes=2048, status=DocumentStatus.UNRECOGNIZED
        )

        # Cria um grupo de documentos usando a API atual
        result = DocumentGroup(document_code="123", files=[valid_doc, invalid_doc])

        # Executa update
        controller._update_results(result)

        # Verifica se os labels foram atualizados
        assert controller.view.validated_label.configure.called
        assert controller.view.unrecognized_label.configure.called

        # Verifica se as listas foram populadas
        assert controller.view.validated_list.insert.called
        assert controller.view.unrecognized_list.insert.called

        # Verifica se o progresso foi finalizado
        controller.view.progress_bar.set.assert_called_with(1.0)

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

    def test_export_results_without_data(self):
        """
        Testa exportação sem dados.
        """
        controller = MainController(self.mock_view)

        # Executa exportação sem dados
        controller.export_results()

        # Verifica se logou mensagem de erro
        # (mock_datetime seria necessário para verificar mensagem exata)
