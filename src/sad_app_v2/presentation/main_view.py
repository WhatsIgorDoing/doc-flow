from typing import Dict, List

import customtkinter as ctk

from ..core.domain import DocumentFile


class MainView(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.controller = None

        self.title("SAD App v2.0 - Sistema de Automação de Documentos")
        self.geometry("1280x720")
        self.minsize(1024, 768)

        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(2, weight=1)

        self.unrecognized_checkboxes: Dict[str, ctk.CTkCheckBox] = {}

        self._create_top_frame()
        self._create_tab_view()
        self._create_bottom_frame()

    def set_controller(self, controller):
        """Define o controller para a view."""
        self.controller = controller
        # Conecta os comandos dos botões agora que o controller existe
        self.manifest_button.configure(command=self.controller.select_manifest_file)
        self.source_dir_button.configure(
            command=self.controller.select_source_directory
        )
        self.validate_button.configure(command=self.controller.on_validate_batch_click)
        self.resolve_button.configure(command=self.controller.on_resolve_click)
        self.output_dir_button.configure(
            command=self.controller.select_output_directory
        )
        self.template_button.configure(
            command=self.controller.select_master_template_file
        )
        self.organize_button.configure(command=self.controller.on_organize_lots_click)

    def _create_top_frame(self):
        self.top_frame = ctk.CTkFrame(self)
        self.top_frame.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        self.top_frame.grid_columnconfigure(1, weight=1)
        self.manifest_entry = ctk.CTkEntry(
            self.top_frame, placeholder_text="Selecione o arquivo do manifesto..."
        )
        self.manifest_entry.grid(row=0, column=1, padx=10, pady=5, sticky="ew")
        self.manifest_button = ctk.CTkButton(
            self.top_frame, text="Selecionar Manifesto..."
        )
        self.manifest_button.grid(row=0, column=2, padx=10, pady=5)
        self.source_dir_entry = ctk.CTkEntry(
            self.top_frame, placeholder_text="Selecione a pasta com os documentos..."
        )
        self.source_dir_entry.grid(row=1, column=1, padx=10, pady=5, sticky="ew")
        self.source_dir_button = ctk.CTkButton(
            self.top_frame, text="Selecionar Pasta..."
        )
        self.source_dir_button.grid(row=1, column=2, padx=10, pady=5)
        self.validate_button = ctk.CTkButton(self, text="VALIDAR LOTE", height=40)
        self.validate_button.grid(row=1, column=0, padx=10, pady=10, sticky="ew")

    def _create_tab_view(self):
        self.tab_view = ctk.CTkTabview(self)
        self.tab_view.grid(row=2, column=0, padx=10, pady=10, sticky="nsew")

        self.tab_validation = self.tab_view.add("1. Validação e Resolução")
        self.tab_organization = self.tab_view.add("2. Organização e Saída")
        self._create_validation_tab_layout(self.tab_validation)
        self._create_organization_tab_layout(self.tab_organization)

        # Nota: CustomTkinter não suporta desabilitar abas via state
        # A lógica de controle será feita via controller

    def _create_validation_tab_layout(self, tab):
        tab.grid_columnconfigure((0, 1), weight=1)
        tab.grid_rowconfigure(1, weight=1)
        self.validated_label = ctk.CTkLabel(tab, text="Arquivos Validados (0)")
        self.validated_label.grid(row=0, column=0, padx=10, pady=5, sticky="w")
        self.validated_list = ctk.CTkTextbox(tab)
        self.validated_list.grid(row=1, column=0, padx=10, pady=10, sticky="nsew")
        self.unrecognized_label = ctk.CTkLabel(
            tab, text="Arquivos Não Reconhecidos (0)"
        )
        self.unrecognized_label.grid(row=0, column=1, padx=10, pady=5, sticky="w")
        self.unrecognized_frame = ctk.CTkScrollableFrame(tab)
        self.unrecognized_frame.grid(row=1, column=1, padx=10, pady=10, sticky="nsew")
        self.resolve_panel = ctk.CTkFrame(tab)
        self.resolve_panel.grid(row=2, column=1, padx=10, pady=10, sticky="ew")
        self.resolve_panel.grid_columnconfigure(0, weight=1)

        # ComboBox de perfis e botão de resolver
        self.profile_combobox = ctk.CTkComboBox(self.resolve_panel, values=[])
        self.profile_combobox.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        self.resolve_button = ctk.CTkButton(
            self.resolve_panel, text="Tentar Resolver Selecionados"
        )
        self.resolve_button.grid(row=0, column=1, padx=10, pady=10)

        self.set_resolve_panel_state("disabled")

    def _create_organization_tab_layout(self, tab):
        """Cria os widgets para a aba de organização."""
        tab.grid_columnconfigure(1, weight=1)

        # Pasta de Destino
        ctk.CTkLabel(tab, text="Pasta de Destino Raiz:").grid(
            row=0, column=0, padx=10, pady=10, sticky="w"
        )
        self.output_dir_entry = ctk.CTkEntry(
            tab, placeholder_text="Selecione a pasta para salvar os lotes..."
        )
        self.output_dir_entry.grid(row=0, column=1, padx=10, pady=10, sticky="ew")
        self.output_dir_button = ctk.CTkButton(tab, text="Selecionar...")
        self.output_dir_button.grid(row=0, column=2, padx=10, pady=10)

        # Template Mestre
        ctk.CTkLabel(tab, text="Template de Manifesto:").grid(
            row=1, column=0, padx=10, pady=10, sticky="w"
        )
        self.template_entry = ctk.CTkEntry(
            tab, placeholder_text="Selecione o arquivo de template .xlsx..."
        )
        self.template_entry.grid(row=1, column=1, padx=10, pady=10, sticky="ew")
        self.template_button = ctk.CTkButton(tab, text="Selecionar...")
        self.template_button.grid(row=1, column=2, padx=10, pady=10)

        # Configurações Numéricas
        ctk.CTkLabel(tab, text="Máx. de Documentos por Lote:").grid(
            row=2, column=0, padx=10, pady=10, sticky="w"
        )
        self.max_docs_entry = ctk.CTkEntry(tab)
        self.max_docs_entry.grid(row=2, column=1, padx=(10, 0), pady=10, sticky="w")

        ctk.CTkLabel(tab, text="Nº Sequencial Inicial (XXXX):").grid(
            row=3, column=0, padx=10, pady=10, sticky="w"
        )
        self.seq_num_entry = ctk.CTkEntry(tab)
        self.seq_num_entry.grid(row=3, column=1, padx=(10, 0), pady=10, sticky="w")

        # Padrão de Nomenclatura
        ctk.CTkLabel(tab, text="Padrão de Nomenclatura:").grid(
            row=4, column=0, padx=10, pady=10, sticky="w"
        )
        self.lot_pattern_entry = ctk.CTkEntry(tab)
        self.lot_pattern_entry.insert(0, "0130869-CZ6-PGV-G-XXXX-2025-eGRDT")
        self.lot_pattern_entry.grid(
            row=4, column=1, columnspan=2, padx=10, pady=10, sticky="ew"
        )

        # Botão Final
        self.organize_button = ctk.CTkButton(
            tab, text="ORGANIZAR E GERAR LOTES", height=40, fg_color="green"
        )
        self.organize_button.grid(
            row=5, column=0, columnspan=3, padx=10, pady=20, sticky="ew"
        )

    def _create_bottom_frame(self):
        # ... (sem alterações)
        self.bottom_frame = ctk.CTkFrame(self)
        self.bottom_frame.grid(row=3, column=0, padx=10, pady=10, sticky="ew")
        self.bottom_frame.grid_columnconfigure(0, weight=1)
        self.log_textbox = ctk.CTkTextbox(self.bottom_frame, height=150)
        self.log_textbox.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        self.progress_bar = ctk.CTkProgressBar(self.bottom_frame)
        self.progress_bar.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="ew")
        self.clear_log()
        self.set_progress(0)

    # --- Métodos de Feedback e Atualização da UI ---
    def set_resolve_panel_state(self, state: str):
        # ... (sem alterações)
        self.profile_combobox.configure(state=state)
        self.resolve_button.configure(state=state)

    def populate_profiles_dropdown(self, profiles: List[str]):
        # Manter apenas a opção RIR no ComboBox
        rir_profiles = ["RIR (buscar nome no documento)"]
        self.profile_combobox.configure(values=rir_profiles)
        if rir_profiles:
            self.profile_combobox.set(rir_profiles[0])

    def update_validated_list(self, validated_files: List[DocumentFile]):
        # ... (sem alterações)
        self.validated_label.configure(
            text=f"Arquivos Validados ({len(validated_files)})"
        )
        self.validated_list.configure(state="normal")
        self.validated_list.delete("1.0", ctk.END)
        if validated_files:
            self.validated_list.insert(
                "1.0", "\n".join(sorted([f.path.name for f in validated_files]))
            )
        self.validated_list.configure(state="disabled")

    def update_unrecognized_list(self, unrecognized_files: List[DocumentFile]):
        # ... (sem alterações)
        self.unrecognized_label.configure(
            text=f"Arquivos Não Reconhecidos ({len(unrecognized_files)})"
        )
        for widget in self.unrecognized_frame.winfo_children():
            widget.destroy()
        self.unrecognized_checkboxes.clear()
        for i, file in enumerate(sorted(unrecognized_files, key=lambda f: f.path.name)):
            checkbox = ctk.CTkCheckBox(
                self.unrecognized_frame,
                text=file.path.name,
                command=self._on_checkbox_change,
            )
            checkbox.grid(row=i, column=0, padx=5, pady=2, sticky="w")
            self.unrecognized_checkboxes[file.path.name] = checkbox

    def add_log_message(self, message: str):
        """Adiciona uma mensagem ao log da UI."""
        self.log_textbox.configure(state="normal")
        self.log_textbox.insert(ctk.END, f"{message}\n")
        self.log_textbox.configure(state="disabled")
        self.log_textbox.see(ctk.END)

    def clear_log(self):
        self.log_textbox.configure(state="normal")
        self.log_textbox.delete("1.0", ctk.END)
        self.log_textbox.configure(state="disabled")

    def _on_checkbox_change(self):
        """Callback chamado quando um checkbox é marcado/desmarcado."""
        if self.controller:
            self.controller.on_checkbox_selection_changed()

    def set_progress(self, value: float):
        """Define o valor da barra de progresso (0.0 a 1.0)."""
        self.progress_bar.set(value)

    def set_organize_button_state(self, state: str):
        """Define o estado do botão organizar (normal/disabled)."""
        self.organize_button.configure(state=state)

    def start(self):
        self.mainloop()
