# src/sad_app_v2/presentation/view_controller.py

import threading
from pathlib import Path
from tkinter import filedialog, messagebox
from typing import List

import customtkinter as ctk

from sad_app_v2.core.exceptions import CoreError
from sad_app_v2.core.use_cases.organize_lots import OrganizeAndGenerateLotsUseCase
from sad_app_v2.core.use_cases.validate_batch import ValidateBatchUseCase
from sad_app_v2.infrastructure.file_system import (
    FileSystemFileRepository,
    SafeFileSystemManager,
)
from sad_app_v2.infrastructure.services import GreedyLotBalancerService
from sad_app_v2.infrastructure.template_filler import OpenpyxlTemplateFiller

from ..core.domain import DocumentFile, DocumentStatus
from ..infrastructure.excel_reader import ExcelManifestRepository


class ViewController:
    def __init__(self, extractor_service):
        self.extractor_service = extractor_service
        self.view = None
        # Estado da Aplicação
        self.manifest_path: Path | None = None
        self.source_directory: Path | None = None
        self.output_directory: Path | None = None
        self.master_template_path: Path | None = None

        self.validated_files: List[DocumentFile] = []
        self.unrecognized_files: List[DocumentFile] = []
        self.all_manifest_items = []

    def set_view(self, view):
        """Define a view associada ao controller."""
        self.view = view

    # --- Métodos de Seleção de Arquivos/Pastas ---
    def select_manifest_file(self):
        path = filedialog.askopenfilename(
            title="Selecione o Manifesto", filetypes=[("Excel", "*.xlsx")]
        )
        if path:
            self.manifest_path = Path(path)
            self.view.manifest_entry.delete(0, ctk.END)
            self.view.manifest_entry.insert(0, str(path))

    def select_source_directory(self):
        path = filedialog.askdirectory(title="Selecione a Pasta de Origem")
        if path:
            self.source_directory = Path(path)
            self.view.source_dir_entry.delete(0, ctk.END)
            self.view.source_dir_entry.insert(0, str(path))

    def select_output_directory(self):
        path = filedialog.askdirectory(title="Selecione a Pasta de Destino Raiz")
        if path:
            self.output_directory = Path(path)
            self.view.output_dir_entry.delete(0, ctk.END)
            self.view.output_dir_entry.insert(0, str(path))

    def select_master_template_file(self):
        path = filedialog.askopenfilename(
            title="Selecione o Template de Manifesto", filetypes=[("Excel", "*.xlsx")]
        )
        if path:
            self.master_template_path = Path(path)
            self.view.template_entry.delete(0, ctk.END)
            self.view.template_entry.insert(0, str(path))

    # --- Lógica dos Casos de Uso ---
    def on_validate_batch_click(self):
        if not self.manifest_path or not self.source_directory:
            messagebox.showerror(
                "Erro", "Por favor, selecione o manifesto e o diretório de origem."
            )
            return

        self._set_ui_busy(True, "Validando...")
        self.view.clear_log()
        self.view.add_log_message("Iniciando validação...")
        threading.Thread(target=self._run_validation, daemon=True).start()

    def _run_validation(self):
        try:
            # ... (código existente)
            manifest_repo = ExcelManifestRepository()
            file_repo = FileSystemFileRepository()
            use_case = ValidateBatchUseCase(manifest_repo, file_repo)
            self.all_manifest_items = manifest_repo.load_from_file(self.manifest_path)
            self.validated_files, self.unrecognized_files = use_case.execute(
                self.manifest_path, self.source_directory
            )

            self.view.after(
                0,
                self.view.add_log_message,
                f"Validação concluída: {len(self.validated_files)} válidos, "
                f"{len(self.unrecognized_files)} não reconhecidos.",
            )
            self.view.after(0, self._update_ui_lists)

        except CoreError as e:
            self.view.after(0, messagebox.showerror, "Erro de Validação", str(e))
        finally:
            self.view.after(0, self._set_ui_busy, False, "VALIDAR LOTE")

    def on_resolve_click(self):
        # ... (código existente)
        selected_filenames = [
            name
            for name, cb in self.view.unrecognized_checkboxes.items()
            if cb.get() == 1
        ]
        if not selected_filenames:
            messagebox.showinfo("Seleção", "Selecione arquivos para resolver.")
            return

        self.view.set_resolve_panel_state("disabled")
        files_to_resolve = [
            f for f in self.unrecognized_files if f.path.name in selected_filenames
        ]

        # Usar sempre a lógica RIR (única opção disponível)
        for file in files_to_resolve:
            threading.Thread(
                target=self._run_rir_resolution, args=(file,), daemon=True
            ).start()

    def _run_rir_resolution(self, file: DocumentFile):
        """Executa a resolução específica para RIR em thread separada."""
        try:
            # Log inicial
            self.view.after(
                0,
                self.view.add_log_message,
                f"🔍 RIR: Iniciando resolução para '{file.path.name}'",
            )

            # 1. Extrair texto do documento
            self.view.after(
                0,
                self.view.add_log_message,
                f"📄 RIR: Extraindo texto de '{file.path.name}'",
            )
            extracted_text = self.extractor_service.extract_text(file, "RIR")

            if not extracted_text:
                self.view.after(
                    0, self.view.add_log_message, f"❌ RIR: Falha na extração de texto"
                )
                raise CoreError("Não foi possível extrair texto do documento")

            # Log do texto extraído (primeiros 200 caracteres)
            text_preview = extracted_text[:200].replace("\n", " ").replace("\r", " ")
            self.view.after(
                0,
                self.view.add_log_message,
                f"📋 RIR: Texto extraído (preview): '{text_preview}...'",
            )

            # 2. Buscar nome após "Relatório:" especificamente
            import re

            # Padrão específico para pegar o código RIR (mais de 3 caracteres, com underscores)
            pattern = r"Relatório:\s*([A-Z0-9_\.\-]{4,}(?:_[A-Z0-9_\.\-]+)*)"
            self.view.after(
                0, self.view.add_log_message, f"🔎 RIR: Buscando padrão: '{pattern}'"
            )

            # Buscar todas as ocorrências e pegar a que tem mais caracteres
            matches = re.findall(pattern, extracted_text, re.IGNORECASE | re.MULTILINE)
            match = None
            if matches:
                # Pegar a correspondência mais longa (mais específica)
                longest_match = max(matches, key=len)
                if len(longest_match) > 3:  # Deve ter mais que 3 caracteres
                    match = type(
                        "Match", (), {"group": lambda self, n: longest_match}
                    )()
                    self.view.after(
                        0,
                        self.view.add_log_message,
                        f"🎯 RIR: Encontradas {len(matches)} correspondências, usando a mais longa",
                    )
                else:
                    match = None

            if not match:
                self.view.after(
                    0,
                    self.view.add_log_message,
                    f"❌ RIR: Padrão não encontrado no texto",
                )
                raise CoreError(
                    "Não foi encontrado nome do relatório após 'Relatório:' no documento"
                )

            extracted_name = match.group(1).strip()
            self.view.after(
                0,
                self.view.add_log_message,
                f"✅ RIR: Nome extraído: '{extracted_name}'",
            )
            self.view.after(
                0,
                self.view.add_log_message,
                f"📏 RIR: Tamanho do nome: {len(extracted_name)} caracteres",
            )

            # 3. Buscar item correspondente no manifesto
            self.view.after(
                0,
                self.view.add_log_message,
                f"🔍 RIR: Buscando '{extracted_name}' no manifesto ({len(self.all_manifest_items)} itens)",
            )
            matched_item = None
            items_checked = 0
            for item in self.all_manifest_items:
                items_checked += 1
                if (
                    extracted_name.upper() in item.document_code.upper()
                    or item.document_code.upper() in extracted_name.upper()
                ):
                    matched_item = item
                    self.view.after(
                        0,
                        self.view.add_log_message,
                        f"✅ RIR: Correspondência encontrada após {items_checked} itens",
                    )
                    self.view.after(
                        0,
                        self.view.add_log_message,
                        f"📋 RIR: Item manifesto: '{item.document_code}' (rev: {item.revision})",
                    )
                    break

            if not matched_item:
                self.view.after(
                    0,
                    self.view.add_log_message,
                    f"⚠️ RIR: Não encontrado no manifesto (verificou {items_checked} itens)",
                )

            # 4. Renomear arquivo com nome extraído (sempre usar o nome extraído)
            self.view.after(
                0,
                self.view.add_log_message,
                f"📁 RIR: Preparando renomeação de '{file.path.name}'",
            )
            file_manager = SafeFileSystemManager()
            original_path = file.path
            file_extension = original_path.suffix

            # Gerar novo nome: nome_extraído_revisão.extensão
            # Se encontrou no manifesto, usar a revisão. Senão, usar "A" como padrão
            revision = matched_item.revision if matched_item else "A"
            new_filename = f"{extracted_name}_{revision}{file_extension}"
            new_path = original_path.parent / new_filename

            self.view.after(
                0,
                self.view.add_log_message,
                f"🔄 RIR: '{original_path.name}' → '{new_filename}' (rev: {revision})",
            )

            # Renomear o arquivo fisicamente
            self.view.after(
                0,
                self.view.add_log_message,
                f"💾 RIR: Executando renomeação física do arquivo",
            )
            file_manager.move_file(original_path, new_path)
            self.view.after(
                0, self.view.add_log_message, f"✅ RIR: Arquivo renomeado com sucesso"
            )

            # 5. Criar arquivo resolvido com novo caminho
            self.view.after(
                0,
                self.view.add_log_message,
                f"📝 RIR: Criando objeto DocumentFile para '{new_path.name}'",
            )
            resolved_file = DocumentFile(new_path, file.size_bytes)
            if matched_item:
                resolved_file.manifest_item = matched_item
                resolved_file.status = DocumentStatus.VALIDATED
                self.view.after(
                    0,
                    self.view.add_log_message,
                    f"✅ RIR: Status definido como VALIDATED",
                )
            else:
                # Se não encontrou no manifesto, manter como reconhecido mas sem item
                resolved_file.status = DocumentStatus.RECOGNIZED
                self.view.after(
                    0,
                    self.view.add_log_message,
                    f"⚠️ RIR: Status definido como RECOGNIZED (sem manifesto)",
                )

            # 6. Atualizar listas
            self.view.after(
                0, self.view.add_log_message, f"📊 RIR: Atualizando listas de arquivos"
            )
            self.unrecognized_files.remove(file)
            if matched_item:
                self.validated_files.append(resolved_file)
                self.view.after(
                    0,
                    self.view.add_log_message,
                    f"✅ RIR: Adicionado à lista validated_files ({len(self.validated_files)} itens)",
                )
            else:
                # Se não tem item no manifesto, adicionar à lista de reconhecidos
                if not hasattr(self, "recognized_files"):
                    self.recognized_files = []
                self.recognized_files.append(resolved_file)
                self.view.after(
                    0,
                    self.view.add_log_message,
                    f"⚠️ RIR: Adicionado à lista recognized_files ({len(self.recognized_files)} itens)",
                )

            # 7. Log da operação final
            if matched_item:
                log_msg = f"🎉 RIR SUCESSO: '{original_path.name}' → '{new_filename}' (extraído: '{extracted_name}', manifesto: OK)"
            else:
                log_msg = f"🎉 RIR SUCESSO: '{original_path.name}' → '{new_filename}' (extraído: '{extracted_name}', manifesto: N/A)"

            self.view.after(0, self.view.add_log_message, log_msg)
            self.view.after(
                0, self.view.add_log_message, f"🔄 RIR: Atualizando interface..."
            )
            self.view.after(0, self._update_ui_lists)

        except CoreError as e:
            self.view.after(0, self.view.add_log_message, f"❌ RIR ERRO: {str(e)}")
            self.view.after(
                0,
                messagebox.showinfo,
                "Falha na Resolução RIR",
                f"Erro ao resolver RIR '{file.path.name}':\n{e}",
            )
        except Exception as e:
            self.view.after(
                0, self.view.add_log_message, f"💥 RIR ERRO CRÍTICO: {str(e)}"
            )
            self.view.after(
                0,
                messagebox.showinfo,
                "Erro Inesperado",
                f"Erro inesperado ao processar '{file.path.name}':\n{e}",
            )
        finally:
            self.view.after(
                0,
                self.view.add_log_message,
                f"🏁 RIR: Finalizando processamento de '{file.path.name}'",
            )
            self.view.after(0, self.view.set_resolve_panel_state, "normal")

    def on_organize_lots_click(self):
        # 1. Validar entradas da UI
        try:
            max_docs = int(self.view.max_docs_entry.get())
            start_seq = int(self.view.seq_num_entry.get())
            pattern = self.view.lot_pattern_entry.get()
            if not all([self.output_directory, self.master_template_path, pattern]):
                raise ValueError("Campos obrigatórios não preenchidos.")
        except (ValueError, TypeError):
            messagebox.showerror(
                "Erro de Configuração",
                "Verifique as configurações de saída. Campos numéricos "
                "devem ser números e todos os caminhos devem ser selecionados.",
            )
            return

        self._set_ui_busy(True, "Organizando...")
        self.view.clear_log()
        self.view.add_log_message("Iniciando organização final...")

        config = {
            "validated_files": self.validated_files,
            "output_directory": self.output_directory,
            "master_template_path": self.master_template_path,
            "max_docs_per_lot": max_docs,
            "start_sequence_number": start_seq,
            "lot_name_pattern": pattern,
        }
        threading.Thread(
            target=self._run_organization, kwargs=config, daemon=True
        ).start()

    def _run_organization(self, **kwargs):
        try:
            # Composição final dos serviços
            balancer = GreedyLotBalancerService()
            file_manager = SafeFileSystemManager()
            template_filler = OpenpyxlTemplateFiller(file_manager)
            use_case = OrganizeAndGenerateLotsUseCase(
                balancer, file_manager, template_filler
            )

            # Execução
            result = use_case.execute(**kwargs)

            if result.success:
                msg = (
                    f"Organização concluída!\n\n- {result.lots_created} lotes "
                    f"criados.\n- {result.files_moved} arquivos movidos."
                )
                self.view.after(
                    0, self.view.add_log_message, "SUCESSO: " + msg.replace("\n\n", " ")
                )
                self.view.after(0, messagebox.showinfo, "Sucesso", msg)
            else:
                raise CoreError(result.message)

        except CoreError as e:
            self.view.after(0, self.view.add_log_message, f"ERRO: {e}")
            self.view.after(0, messagebox.showerror, "Erro na Organização", str(e))
        finally:
            self.view.after(0, self._set_ui_busy, False, "VALIDAR LOTE")
            self.view.after(0, self._reset_state)

    def _update_ui_lists(self):
        """Método central para atualizar as listas da UI com o estado atual."""
        self.view.update_validated_list(self.validated_files)
        self.view.update_unrecognized_list(self.unrecognized_files)

    def _set_ui_busy(self, busy: bool, status_text: str = ""):
        """Controla o estado ocupado da UI."""
        self.view.set_organize_button_state("disabled" if busy else "normal")
        if status_text:
            self.view.add_log_message(f"STATUS: {status_text}")

    def _reset_state(self):
        """Reinicia o estado após operações."""
        self.view.progress_bar.set(0)
        self.view.add_log_message("Pronto para nova operação.")

        # Atualizar estado dos botões baseado na seleção atual
        self.on_checkbox_selection_changed()

    def on_checkbox_selection_changed(self):
        """Atualiza o estado dos botões baseado na seleção de checkboxes."""
        if not hasattr(self, "unrecognized_files") or not self.unrecognized_files:
            # Não há arquivos não reconhecidos
            self.view.set_resolve_panel_state("disabled")
            return

        # Verificar se há algum checkbox marcado
        has_selection = any(
            cb.get() == 1 for cb in self.view.unrecognized_checkboxes.values()
        )

        if has_selection:
            self.view.set_resolve_panel_state("normal")
        else:
            self.view.set_resolve_panel_state("disabled")
