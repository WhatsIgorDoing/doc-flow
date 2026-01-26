import sys
from unittest.mock import MagicMock, patch

import pytest


def test_main_view_class_import():
    """
    Testa se a classe MainView pode ser importada.
    """
    # Mock do customtkinter para este teste
    with patch.dict(sys.modules, {"customtkinter": MagicMock()}):
        try:
            from src.sad_app_v2.presentation.main_view import MainView

            # Verifica se a classe foi importada
            assert MainView is not None
        except ImportError as e:
            pytest.fail(f"Falha ao importar MainView: {e}")


def test_main_view_module_import():
    """
    Testa se o módulo pode ser importado.
    """
    with patch.dict(sys.modules, {"customtkinter": MagicMock()}):
        from src.sad_app_v2.presentation import main_view

        assert main_view is not None
        assert hasattr(main_view, "MainView")


def test_main_view_initialization_mocked():
    """
    Testa se a MainView pode ser inicializada com mocks.
    """
    # Mock completo do customtkinter
    with patch("customtkinter.CTk") as mock_ctk_class:
        mock_instance = MagicMock()
        mock_ctk_class.return_value = mock_instance

        from src.sad_app_v2.presentation.main_view import MainView

        # Instancia com mock
        app = MainView()

        # Verifica se a classe foi instanciada
        assert app is not None
        assert hasattr(app, "_create_top_frame")
        assert hasattr(app, "_create_tab_view")
        assert hasattr(app, "_create_bottom_frame")


@pytest.mark.skip(reason="Requer ambiente gráfico para testar interface real")
def test_main_view_real_interface():
    """
    Teste que seria executado apenas em ambiente com interface gráfica.
    """
    from src.sad_app_v2.presentation.main_view import MainView

    with patch.object(MainView, "mainloop"):
        app = MainView()
        assert hasattr(app, "top_frame")
        assert hasattr(app, "tab_view")
        assert hasattr(app, "bottom_frame")
