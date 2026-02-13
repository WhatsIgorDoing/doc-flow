from typing import Callable, List, Optional

from nicegui import ui

from app.domain.entities import DocumentFile
from app.ui.components.atoms.card import GlassCard
from app.ui.theme.design_system import design


class ResultsList(GlassCard):
    """
    Results list with staggered entry animations.
    Supports checkbox selection for unrecognized files.
    """

    def __init__(
        self,
        on_resolve: Optional[Callable] = None,
        on_export: Optional[Callable] = None,
    ):
        super().__init__()
        self.classes("w-full transition-all duration-500 hidden")
        self.style("min-height: 200px")

        self._on_resolve = on_resolve
        self._on_export = on_export
        self._unrecognized_files: List[DocumentFile] = []
        self._checkboxes: dict = {}

        with self:
            with ui.row().classes("w-full items-center justify-between mb-6"):
                with ui.row().classes("items-center gap-4"):
                    ui.label("Resultados do Processamento").classes(design.typo.h3)
                    if self._on_export:
                        ui.button(
                            "Exportar Excel",
                            icon="file_download",
                            on_click=self._handle_export,
                        ).props("flat dense text-color=primary")

                self.status_label = ui.label("Aguardando...").classes(
                    "text-gray-400 font-medium"
                )

            # Grid for stats
            with ui.grid(columns=3).classes("w-full gap-4 mb-6"):
                self._stat_total = self._stat_card(
                    "Total", "0", "bg-gray-50 text-gray-600"
                )
                self._stat_success = self._stat_card(
                    "Sucesso", "0", "bg-green-50 text-green-600"
                )
                self._stat_errors = self._stat_card(
                    "Erros", "0", "bg-red-50 text-red-600"
                )

            ui.separator().classes("mb-4 opacity-50")

            # Action bar for unrecognized files
            self.action_bar = ui.row().classes(
                "w-full items-center justify-between mb-4 hidden"
            )
            with self.action_bar:
                self._selection_label = ui.label("0 selecionados").classes(
                    "text-sm text-gray-500"
                )
                with ui.row().classes("gap-2"):
                    ui.button(
                        "Selecionar Todos",
                        on_click=self._select_all,
                    ).props("flat dense text-color=grey-7 size=sm")
                    ui.button(
                        "Limpar Seleção",
                        on_click=self._clear_selection,
                    ).props("flat dense text-color=grey-7 size=sm")
                    self.btn_resolve = (
                        ui.button(
                            "Resolver Selecionados",
                            on_click=self._handle_resolve,
                            icon="auto_fix_high",
                        )
                        .props("color=orange dense")
                        .classes("ml-2")
                    )

            # List container
            self.list_container = ui.column().classes("w-full gap-3")

    def _stat_card(self, label: str, value: str, color_class: str):
        with ui.column().classes(
            f"p-4 rounded-xl items-center justify-center {color_class}"
        ) as card:
            value_label = ui.label(value).classes("text-3xl font-bold")
            ui.label(label).classes("text-xs uppercase tracking-widest opacity-80")
        return value_label

    def display_results(self, result):
        """Populates the list with animation."""
        self.classes(remove="hidden")
        self.list_container.clear()
        self._checkboxes.clear()
        self._unrecognized_files = list(result.unrecognized_files)

        total = len(result.validated_files) + len(result.unrecognized_files)
        self._stat_total.text = str(total)
        self._stat_success.text = str(len(result.validated_files))
        self._stat_errors.text = str(len(result.unrecognized_files))

        # Validated Files
        for i, file in enumerate(result.validated_files):
            self._create_validated_item(file.path.name, i * 50)

        # Unrecognized Files (with checkboxes)
        if self._unrecognized_files:
            self.action_bar.classes(remove="hidden")
            for i, file in enumerate(self._unrecognized_files):
                self._create_unrecognized_item(file, (i * 50) + 200)
        else:
            self.action_bar.classes(add="hidden")

    def _create_validated_item(self, text: str, delay_ms: int):
        """Creates a validated item row with slide-in animation."""
        with self.list_container:
            with ui.row().classes(
                "w-full p-3 bg-gray-50/50 rounded-lg items-center gap-3 "
                "transform transition-all duration-500 translate-y-4 opacity-0 user-row"
            ):
                ui.icon("check_circle").classes("text-green-500")
                ui.label(text).classes(
                    "text-sm font-medium text-gray-700 truncate flex-1"
                )

        ui.run_javascript(f"""
            setTimeout(() => {{
                const rows = document.querySelectorAll('.user-row');
                const last = rows[rows.length-1];
                if(last) {{
                    last.classList.remove('translate-y-4', 'opacity-0');
                }}
            }}, {delay_ms});
        """)

    def _create_unrecognized_item(self, file: DocumentFile, delay_ms: int):
        """Creates an unrecognized item row with checkbox and slide-in animation."""
        with self.list_container:
            with ui.row().classes(
                "w-full p-3 bg-orange-50/50 rounded-lg items-center gap-3 "
                "transform transition-all duration-500 translate-y-4 opacity-0 user-row"
            ):
                cb = ui.checkbox(on_change=self._update_selection_count).props("dense")
                self._checkboxes[id(file)] = (cb, file)
                ui.icon("warning").classes("text-orange-500")
                ui.label(file.path.name).classes(
                    "text-sm font-medium text-gray-700 truncate flex-1"
                )

        ui.run_javascript(f"""
            setTimeout(() => {{
                const rows = document.querySelectorAll('.user-row');
                const last = rows[rows.length-1];
                if(last) {{
                    last.classList.remove('translate-y-4', 'opacity-0');
                }}
            }}, {delay_ms});
        """)

    def _update_selection_count(self):
        """Updates the selection count label."""
        count = sum(1 for cb, _ in self._checkboxes.values() if cb.value)
        self._selection_label.text = f"{count} selecionados"
        self.btn_resolve.set_enabled(count > 0)

    def _select_all(self):
        """Select all unrecognized files."""
        for cb, _ in self._checkboxes.values():
            cb.value = True
        self._update_selection_count()

    def _clear_selection(self):
        """Clear all selections."""
        for cb, _ in self._checkboxes.values():
            cb.value = False
        self._update_selection_count()

    def get_selected_files(self) -> List[DocumentFile]:
        """Returns list of selected unrecognized DocumentFiles."""
        return [file for cb, file in self._checkboxes.values() if cb.value]

    async def _handle_resolve(self):
        """Triggers the resolve callback with selected files."""
        if self._on_resolve:
            selected = self.get_selected_files()
            if selected:
                self.btn_resolve.props("loading")
                try:
                    await self._on_resolve(selected)
                finally:
                    self.btn_resolve.props(remove="loading")

    async def _handle_export(self):
        """Triggers the export callback."""
        if self._on_export:
            # Handle both async and sync callbacks
            import inspect

            if inspect.iscoroutinefunction(self._on_export):
                await self._on_export()
            else:
                self._on_export()
