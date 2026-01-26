"""
Componente de Tooltip aprimorado para SAD App v2.0
Sistema de tooltips informativos com melhor UX.
"""

import tkinter as tk
from typing import Optional


class ToolTip:
    """
    Tooltip melhorado para CustomTkinter com delay e posiclearcionamento inteligente.
    """

    def __init__(self, widget, text: str, delay: int = 500, wraplength: int = 300):
        self.widget = widget
        self.text = text
        self.delay = delay
        self.wraplength = wraplength
        self.tooltip_window: Optional[tk.Toplevel] = None
        self.id_after: Optional[str] = None

        # Bind dos eventos
        self.widget.bind("<Enter>", self.on_enter)
        self.widget.bind("<Leave>", self.on_leave)
        self.widget.bind("<ButtonPress>", self.hide_tooltip)

    def on_enter(self, event=None):
        """Inicia o timer para mostrar o tooltip."""
        self.schedule_tooltip()

    def on_leave(self, event=None):
        """Esconde o tooltip e cancela o timer."""
        self.cancel_tooltip()
        self.hide_tooltip()

    def schedule_tooltip(self):
        """Agenda a exibição do tooltip após o delay."""
        self.cancel_tooltip()
        self.id_after = self.widget.after(self.delay, self.show_tooltip)

    def cancel_tooltip(self):
        """Cancela o tooltip agendado."""
        if self.id_after:
            self.widget.after_cancel(self.id_after)
            self.id_after = None

    def show_tooltip(self):
        """Exibe o tooltip próximo ao widget."""
        if self.tooltip_window:
            return

        # Criar janela do tooltip
        self.tooltip_window = tk.Toplevel(self.widget)
        self.tooltip_window.wm_overrideredirect(True)
        self.tooltip_window.configure(bg="#2b2b2b", relief="solid", borderwidth=1)

        # Criar label com o texto
        label = tk.Label(
            self.tooltip_window,
            text=self.text,
            background="#2b2b2b",
            foreground="#ffffff",
            font=("Segoe UI", 10),
            wraplength=self.wraplength,
            justify="left",
            padx=8,
            pady=6,
        )
        label.pack()

        # Posicionar o tooltip
        self._position_tooltip()

    def _position_tooltip(self):
        """Posiciona o tooltip de forma inteligente."""
        if not self.tooltip_window:
            return

        # Obter posição do widget
        x = self.widget.winfo_rootx()
        y = self.widget.winfo_rooty() + self.widget.winfo_height() + 5

        # Obter dimensões da tela
        screen_width = self.widget.winfo_screenwidth()
        screen_height = self.widget.winfo_screenheight()

        # Atualizar para obter dimensões do tooltip
        self.tooltip_window.update_idletasks()
        tooltip_width = self.tooltip_window.winfo_reqwidth()
        tooltip_height = self.tooltip_window.winfo_reqheight()

        # Ajustar posição se sair da tela
        if x + tooltip_width > screen_width:
            x = screen_width - tooltip_width - 10

        if y + tooltip_height > screen_height:
            y = self.widget.winfo_rooty() - tooltip_height - 5

        # Posicionar o tooltip
        self.tooltip_window.geometry(f"+{x}+{y}")

    def hide_tooltip(self, event=None):
        """Esconde o tooltip."""
        if self.tooltip_window:
            self.tooltip_window.destroy()
            self.tooltip_window = None

    def update_text(self, new_text: str):
        """Atualiza o texto do tooltip."""
        self.text = new_text
        if self.tooltip_window:
            self.hide_tooltip()


class TooltipManager:
    """Gerenciador central de tooltips para a aplicação."""

    # Textos dos tooltips organizados por contexto
    TOOLTIPS = {
        "validation": {
            "manifest_file": (
                "Arquivo Excel com a estrutura:\n"
                "• Coluna A: Código SAP\n"
                "• Coluna B: Descrição\n"
                "• Coluna C: Total de páginas\n"
                "• Coluna D: Nome do arquivo"
            ),
            "source_directory": (
                "Pasta contendo os documentos.\n"
                "Os arquivos serão comparados\n"
                "com o manifesto para validação."
            ),
            "validate_button": (
                "Inicia o processo de validação:\n"
                "• Carrega o manifesto\n"
                "• Varre o diretório\n"
                "• Classifica os arquivos"
            ),
            "resolve_button": (
                "Tenta resolver arquivos não reconhecidos\n"
                "usando o perfil selecionado.\n"
                "Selecione os arquivos antes de resolver."
            ),
        },
        "organization": {
            "output_directory": (
                "Pasta onde os lotes serão salvos.\n"
                "Será criada uma subpasta\n"
                "para cada lote gerado."
            ),
            "template_file": (
                "Arquivo Excel modelo para manifestos.\n"
                "Deve conter a estrutura desejada\n"
                "para preenchimento automático."
            ),
            "max_documents": (
                "Número máximo de documentos por lote.\n"
                "Valor recomendado: 50-100 documentos\n"
                "para facilitar o manuseio."
            ),
            "sequence_number": (
                "Número inicial da sequência XXXX.\n"
                "Exemplo: 0001 gerará lotes\n"
                "0001, 0002, 0003, etc."
            ),
            "naming_pattern": (
                "Padrão para nomenclatura dos lotes.\n"
                "XXXX será substituído pela\n"
                "sequência numérica automática."
            ),
            "organize_button": (
                "Organiza e gera os lotes finais:\n"
                "• Balanceia documentos\n"
                "• Cria estrutura de pastas\n"
                "• Gera manifestos Excel\n"
                "• Move arquivos com segurança"
            ),
        },
    }

    @classmethod
    def add_tooltip(
        cls, widget, tooltip_key: str, category: str = "validation"
    ) -> ToolTip:
        """
        Adiciona um tooltip a um widget usando as configurações pré-definidas.

        Args:
            widget: Widget do CustomTkinter
            tooltip_key: Chave do tooltip no dicionário TOOLTIPS
            category: Categoria do tooltip ('validation' ou 'organization')

        Returns:
            Instância do ToolTip criado
        """
        tooltip_text = cls.TOOLTIPS.get(category, {}).get(tooltip_key, "")
        if not tooltip_text:
            print(f"⚠️ Tooltip não encontrado: {category}.{tooltip_key}")
            return None

        return ToolTip(widget, tooltip_text)

    @classmethod
    def add_custom_tooltip(cls, widget, text: str, delay: int = 500) -> ToolTip:
        """
        Adiciona um tooltip customizado a um widget.

        Args:
            widget: Widget do CustomTkinter
            text: Texto customizado do tooltip
            delay: Delay em ms antes de mostrar o tooltip

        Returns:
            Instância do ToolTip criado
        """
        return ToolTip(widget, text, delay)
