import pytest
from app.ui.theme.design_system import ResponsiveLayout, DesignTokens


class TestResponsiveLayout:
    def test_get_window_size_large_screen(self):
        """Test window size calculation for screens larger than xlarge breakpoint."""
        # Arrange
        screen_width = 1920
        screen_height = 1080
        xlarge_breakpoint = DesignTokens.BREAKPOINTS["xlarge"]
        assert screen_width >= xlarge_breakpoint

        # Act
        width, height = ResponsiveLayout.get_window_size(screen_width, screen_height)

        # Assert
        expected_width = int(screen_width * 0.7)
        expected_height = int(screen_height * 0.8)
        assert width == expected_width
        assert height == expected_height

    def test_get_window_size_exact_xlarge_breakpoint(self):
        """Test window size calculation for screens exactly at xlarge breakpoint."""
        # Arrange
        screen_width = DesignTokens.BREAKPOINTS["xlarge"]  # 1280
        screen_height = 800

        # Act
        width, height = ResponsiveLayout.get_window_size(screen_width, screen_height)

        # Assert
        expected_width = int(screen_width * 0.7)
        expected_height = int(screen_height * 0.8)
        assert width == expected_width
        assert height == expected_height

    def test_get_window_size_small_screen(self):
        """Test window size calculation for screens smaller than xlarge breakpoint."""
        # Arrange
        screen_width = 1024  # Less than 1280
        screen_height = 768
        xlarge_breakpoint = DesignTokens.BREAKPOINTS["xlarge"]
        assert screen_width < xlarge_breakpoint

        # Act
        width, height = ResponsiveLayout.get_window_size(screen_width, screen_height)

        # Assert
        expected_width = int(screen_width * 0.9)
        expected_height = int(screen_height * 0.9)
        assert width == expected_width
        assert height == expected_height

    def test_get_window_size_very_small_screen(self):
        """Test window size calculation for very small screens."""
        # Arrange
        screen_width = 300
        screen_height = 500

        # Act
        width, height = ResponsiveLayout.get_window_size(screen_width, screen_height)

        # Assert
        expected_width = int(screen_width * 0.9)
        expected_height = int(screen_height * 0.9)
        assert width == expected_width
        assert height == expected_height
