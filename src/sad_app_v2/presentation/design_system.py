"""
Sistema de Design para SAD App v2.0
Constantes visuais, espaçamentos, cores e estilos padronizados.
"""

from typing import Dict, Tuple


class DesignTokens:
    """Tokens de design centralizados para consistência visual."""

    # 🎨 SISTEMA DE CORES
    COLORS = {
        # Cores principais do tema dark
        "primary": "#3b8ed0",
        "primary_hover": "#1f6aa5",
        "primary_disabled": "#2d5a87",
        # Cores de feedback
        "success": "#2fa572",
        "success_hover": "#238c5a",
        "warning": "#ff9500",
        "warning_hover": "#cc7700",
        "error": "#ff453a",
        "error_hover": "#cc362e",
        # Interface
        "surface": "#212121",
        "surface_variant": "#2b2b2b",
        "background": "#1a1a1a",
        "text_primary": "#ffffff",
        "text_secondary": "#cccccc",
        "border": "#404040",
    }

    # 📏 SISTEMA DE ESPAÇAMENTO (múltiplos de 8px)
    SPACING = {
        "xs": 4,  # 4px
        "sm": 8,  # 8px
        "md": 16,  # 16px
        "lg": 24,  # 24px
        "xl": 32,  # 32px
        "xxl": 48,  # 48px
    }

    # 🔤 TIPOGRAFIA
    FONTS = {
        "default": ("Segoe UI", 12),
        "heading": ("Segoe UI", 14, "bold"),
        "label": ("Segoe UI", 11),
        "button": ("Segoe UI", 12, "bold"),
        "small": ("Segoe UI", 10),
    }

    # 📐 DIMENSÕES PADRÃO
    DIMENSIONS = {
        "button_height": 36,
        "button_height_large": 48,
        "input_height": 32,
        "corner_radius": 8,
        "border_width": 1,
    }

    # 🎯 BREAKPOINTS RESPONSIVOS
    BREAKPOINTS = {
        "small": 1024,  # Tablet/laptop pequeno
        "medium": 1280,  # Desktop padrão
        "large": 1600,  # Desktop grande
        "xlarge": 1920,  # Full HD+
    }


class ComponentStyles:
    """Estilos pré-definidos para componentes customizados."""

    @staticmethod
    def primary_button() -> Dict:
        """Estilo para botão primário."""
        return {
            "height": DesignTokens.DIMENSIONS["button_height_large"],
            "corner_radius": DesignTokens.DIMENSIONS["corner_radius"],
            "fg_color": DesignTokens.COLORS["primary"],
            "hover_color": DesignTokens.COLORS["primary_hover"],
            "font": DesignTokens.FONTS["button"],
        }

    @staticmethod
    def success_button() -> Dict:
        """Estilo para botão de sucesso."""
        return {
            "height": DesignTokens.DIMENSIONS["button_height_large"],
            "corner_radius": DesignTokens.DIMENSIONS["corner_radius"],
            "fg_color": DesignTokens.COLORS["success"],
            "hover_color": DesignTokens.COLORS["success_hover"],
            "font": DesignTokens.FONTS["button"],
        }

    @staticmethod
    def secondary_button() -> Dict:
        """Estilo para botão secundário."""
        return {
            "height": DesignTokens.DIMENSIONS["button_height"],
            "corner_radius": DesignTokens.DIMENSIONS["corner_radius"],
            "fg_color": DesignTokens.COLORS["surface_variant"],
            "hover_color": DesignTokens.COLORS["border"],
            "font": DesignTokens.FONTS["default"],
        }

    @staticmethod
    def text_input() -> Dict:
        """Estilo para campos de entrada de texto."""
        return {
            "height": DesignTokens.DIMENSIONS["input_height"],
            "corner_radius": DesignTokens.DIMENSIONS["corner_radius"],
            "font": DesignTokens.FONTS["default"],
        }

    @staticmethod
    def section_frame() -> Dict:
        """Estilo para frames de seção."""
        return {
            "corner_radius": DesignTokens.DIMENSIONS["corner_radius"],
            "fg_color": DesignTokens.COLORS["surface_variant"],
            "border_width": 1,
            "border_color": DesignTokens.COLORS["border"],
        }

    @staticmethod
    def grid_config(columns: int = 1, expand_column: int = 1) -> Dict:
        """Configuração padrão de grid responsivo."""
        config = {
            "padx": DesignTokens.SPACING["md"],
            "pady": DesignTokens.SPACING["sm"],
            "sticky": "ew",
        }
        return config


class ResponsiveLayout:
    """Utilitários para layout responsivo."""

    @staticmethod
    def get_window_size(screen_width: int, screen_height: int) -> Tuple[int, int]:
        """Calcula tamanho ideal da janela baseado na tela."""
        if screen_width >= DesignTokens.BREAKPOINTS["xlarge"]:
            # Tela muito grande - usa 70% da largura
            width = int(screen_width * 0.7)
            height = int(screen_height * 0.8)
        elif screen_width >= DesignTokens.BREAKPOINTS["large"]:
            # Tela grande - usa 80% da largura
            width = int(screen_width * 0.8)
            height = int(screen_height * 0.85)
        elif screen_width >= DesignTokens.BREAKPOINTS["medium"]:
            # Desktop padrão - usa 85% da largura
            width = int(screen_width * 0.85)
            height = int(screen_height * 0.9)
        else:
            # Tela pequena - usa quase toda a tela
            width = int(screen_width * 0.95)
            height = int(screen_height * 0.95)

        # Garantir tamanhos mínimos
        width = max(width, 1024)
        height = max(height, 768)

        return width, height

    @staticmethod
    def get_content_padding(screen_width: int) -> int:
        """Retorna padding adequado baseado no tamanho da tela."""
        if screen_width >= DesignTokens.BREAKPOINTS["large"]:
            return DesignTokens.SPACING["xl"]
        elif screen_width >= DesignTokens.BREAKPOINTS["medium"]:
            return DesignTokens.SPACING["lg"]
        else:
            return DesignTokens.SPACING["md"]

    @staticmethod
    def get_responsive_spacing(screen_width: int) -> Dict[str, int]:
        """Retorna espaçamentos responsivos baseados no tamanho da tela."""
        if screen_width >= DesignTokens.BREAKPOINTS["xlarge"]:
            # Tela muito grande - espaçamentos maiores
            return {
                "xs": 6,
                "sm": 12,
                "md": 20,
                "lg": 28,
                "xl": 36,
                "xxl": 52,
            }
        elif screen_width >= DesignTokens.BREAKPOINTS["large"]:
            # Tela grande - espaçamentos normais+
            return {
                "xs": 5,
                "sm": 10,
                "md": 18,
                "lg": 26,
                "xl": 34,
                "xxl": 50,
            }
        elif screen_width >= DesignTokens.BREAKPOINTS["medium"]:
            # Desktop padrão - espaçamentos padrão
            return DesignTokens.SPACING
        else:
            # Tela pequena - espaçamentos reduzidos
            return {
                "xs": 3,
                "sm": 6,
                "md": 12,
                "lg": 18,
                "xl": 24,
                "xxl": 36,
            }

    @staticmethod
    def configure_responsive_grid(widget, screen_width: int):
        """Configura grid responsivo baseado no tamanho da tela."""
        spacing = ResponsiveLayout.get_responsive_spacing(screen_width)

        # Para telas menores, reduzir padding horizontal
        if screen_width < DesignTokens.BREAKPOINTS["medium"]:
            return {"padx": spacing["sm"], "pady": spacing["xs"], "sticky": "ew"}
        else:
            return {"padx": spacing["md"], "pady": spacing["sm"], "sticky": "ew"}


class TooltipHelper:
    """Helper para criar tooltips informativos."""

    @staticmethod
    def create_tooltip_text() -> Dict[str, str]:
        """Textos explicativos para tooltips."""
        return {
            "manifest_file": "Arquivo Excel (.xlsx) contendo:\n• Coluna A: Código SAP\n• Coluna B: Descrição\n• Coluna C: Total de páginas\n• Coluna D: Nome do arquivo",
            "source_directory": "Pasta contendo os documentos a serem processados.\nOs arquivos serão comparados com o manifesto.",
            "max_documents": "Número máximo de documentos por lote.\nValor recomendado: 50-100 documentos.",
            "sequence_number": "Número inicial para sequência XXXX.\nExemplo: 0001 gerará lotes 0001, 0002, 0003...",
            "naming_pattern": "Padrão para nome dos lotes.\nXXXX será substituído pela sequência numérica.",
            "output_directory": "Pasta onde os lotes organizados serão salvos.\nSerá criada uma subpasta para cada lote.",
            "template_file": "Arquivo Excel modelo para gerar manifestos dos lotes.\nDeve conter a estrutura desejada para preenchimento.",
        }
