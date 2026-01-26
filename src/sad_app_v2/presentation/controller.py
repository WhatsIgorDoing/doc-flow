import threading
from pathlib import Path
from typing import Optional

from src.sad_app_v2.core.domain import DocumentGroup, DocumentStatus
from src.sad_app_v2.core.interfaces import (
    CoreError,
    IFileRepository,
    IManifestRepository,
    ManifestReadError,
)
from src.sad_app_v2.core.use_cases.validate_batch import ValidateBatchUseCase
from src.sad_app_v2.infrastructure.excel_reader import ExcelManifestRepository
from src.sad_app_v2.infrastructure.file_system import FileSystemFileRepository


class MainController:
    """
    Controller principal da aplicação.
    Coordena as interações entre a View e os Use Cases.
    """

    def __init__(self, view):
        """
        Inicializa o controller.

        Args:
            view: Instância da MainView
        """
        self.view = view
        self._setup_dependencies()
        self._bind_events()

        # Estado da aplicação
        self.manifest_path: Optional[Path] = None
        self.source_directory: Optional[Path] = None
        self.last_validation_result: Optional[DocumentGroup] = None

    def _setup_dependencies(self) -> None:
        """
        Configura as dependências (repositories e use cases).
        """
        # Repositories
        self.manifest_repository: IManifestRepository = ExcelManifestRepository()
        self.file_repository: IFileRepository = FileSystemFileRepository()

        # Use Cases
        self.validate_batch_use_case = ValidateBatchUseCase(
            manifest_repo=self.manifest_repository,
            file_repo=self.file_repository,
        )

    def _bind_events(self) -> None:
        """
        Conecta os eventos da view aos métodos do controller.
        """
        # Botão de seleção de manifesto
        self.view.manifest_button.configure(command=self._select_manifest_file)

        # Botão de seleção de diretório fonte
        self.view.source_dir_button.configure(command=self._select_source_directory)

        # Botão de validação
        self.view.validate_button.configure(command=self._start_validation)

    def _select_manifest_file(self) -> None:
        """
        Abre dialog para seleção do arquivo de manifesto.
        """
        from tkinter import filedialog

        import customtkinter as ctk

        file_path = filedialog.askopenfilename(
            title="Selecionar Manifesto",
            filetypes=[("Excel files", "*.xlsx *.xls"), ("All files", "*.*")],
        )

        if file_path:
            self.manifest_path = Path(file_path)
            self.view.manifest_entry.delete(0, ctk.END)
            self.view.manifest_entry.insert(0, str(self.manifest_path))
            self._log_message(f"Manifesto selecionado: {self.manifest_path.name}")
            self._update_validate_button_state()

    def _select_source_directory(self) -> None:
        """
        Abre dialog para seleção do diretório fonte.
        """
        from tkinter import filedialog

        import customtkinter as ctk

        directory_path = filedialog.askdirectory(title="Selecionar Diretório Fonte")

        if directory_path:
            self.source_directory = Path(directory_path)
            self.view.source_dir_entry.delete(0, ctk.END)
            self.view.source_dir_entry.insert(0, str(self.source_directory))
            self._log_message(
                f"Diretório fonte selecionado: {self.source_directory.name}"
            )
            self._update_validate_button_state()

    def _update_validate_button_state(self) -> None:
        """
        Atualiza o estado do botão de validação baseado nos inputs.
        """
        if self.manifest_path and self.source_directory:
            self.view.validate_button.configure(state="normal")
        else:
            self.view.validate_button.configure(state="disabled")

    def _start_validation(self) -> None:
        """
        Inicia o processo de validação em uma thread separada.
        """
        if not self.manifest_path or not self.source_directory:
            self._log_message(
                "❌ Erro: Selecione o manifesto e o diretório fonte", "ERROR"
            )
            return

        # Desabilita botão durante processamento
        self.view.validate_button.configure(state="disabled", text="Validando...")
        self.view.progress_bar.set(0)

        # Executa validação em thread separada
        thread = threading.Thread(target=self._run_validation, daemon=True)
        thread.start()

    def _run_validation(self) -> None:
        """
        Executa a validação em thread separada.
        """
        try:
            self._log_message("🔄 Iniciando validação...")
            self.view.progress_bar.set(0.2)

            # Executa o use case
            result = self.validate_batch_use_case.execute(
                manifest_file=self.manifest_path, source_directory=self.source_directory
            )

            self.view.progress_bar.set(0.8)
            self.last_validation_result = result

            # Atualiza a interface na thread principal
            self.view.after(0, self._update_results, result)

        except ManifestReadError as e:
            self._log_message(f"❌ Erro no manifesto: {e}", "ERROR")
            self.view.after(0, self._reset_validation_button)
        except CoreError as e:
            self._log_message(f"❌ Erro de validação: {e}", "ERROR")
            self.view.after(0, self._reset_validation_button)
        except Exception as e:
            self._log_message(f"❌ Erro inesperado: {e}", "ERROR")
            self.view.after(0, self._reset_validation_button)

    def _update_results(self, result: DocumentGroup) -> None:
        """
        Atualiza a interface com os resultados da validação.

        Args:
            result: Resultado da validação
        """
        # Separa arquivos por status
        valid_documents = [
            doc for doc in result.files if doc.status == DocumentStatus.VALIDATED
        ]
        invalid_documents = [
            doc for doc in result.files if doc.status == DocumentStatus.UNRECOGNIZED
        ]

        # Atualiza contadores nos labels
        validated_count = len(valid_documents)
        unrecognized_count = len(invalid_documents)

        self.view.validated_label.configure(
            text=f"📄 Arquivos Validados ({validated_count})"
        )
        self.view.unrecognized_label.configure(
            text=f"❓ Arquivos Não Reconhecidos ({unrecognized_count})"
        )

        # Limpa listas anteriores
        self.view.validated_list.configure(state="normal")
        self.view.validated_list.delete("1.0", "end")

        self.view.unrecognized_list.configure(state="normal")
        self.view.unrecognized_list.delete("1.0", "end")

        # Popula lista de arquivos validados
        for doc in valid_documents:
            self.view.validated_list.insert(
                "end", f"✅ {doc.path.name} ({doc.size_bytes / 1024 / 1024:.1f} MB)\n"
            )

        # Popula lista de arquivos não reconhecidos
        for doc in invalid_documents:
            self.view.unrecognized_list.insert(
                "end", f"❌ {doc.path.name} ({doc.size_bytes / 1024 / 1024:.1f} MB)\n"
            )

        # Desabilita edição das listas
        self.view.validated_list.configure(state="disabled")
        self.view.unrecognized_list.configure(state="disabled")

        # Finaliza
        self.view.progress_bar.set(1.0)
        self._log_message(
            f"✅ Validação concluída! {validated_count} válidos, "
            f"{unrecognized_count} não reconhecidos"
        )
        self._reset_validation_button()

    def _reset_validation_button(self) -> None:
        """
        Restaura o estado do botão de validação.
        """
        self.view.validate_button.configure(state="normal", text="Validar Lote")

    def _log_message(self, message: str, level: str = "INFO") -> None:
        """
        Adiciona mensagem ao log.

        Args:
            message: Mensagem para adicionar
            level: Nível do log (INFO, ERROR, WARNING)
        """
        import datetime

        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        log_entry = f"[{timestamp}] {message}\n"

        # Adiciona ao log na thread principal
        def update_log():
            self.view.log_textbox.configure(state="normal")
            self.view.log_textbox.insert("end", log_entry)
            self.view.log_textbox.see("end")  # Scroll to bottom
            self.view.log_textbox.configure(state="disabled")

        if threading.current_thread() is threading.main_thread():
            update_log()
        else:
            self.view.after(0, update_log)

    def export_results(self) -> None:
        """
        Exporta os resultados da validação para arquivo.
        TODO: Implementar em versão futura.
        """
        if not self.last_validation_result:
            self._log_message("❌ Nenhum resultado para exportar")
            return

        self._log_message("📁 Exportação será implementada em versão futura")

    def clear_results(self) -> None:
        """
        Limpa os resultados da validação.
        """
        # Limpa listas
        self.view.validated_list.configure(state="normal")
        self.view.validated_list.delete("1.0", "end")
        self.view.validated_list.configure(state="disabled")

        self.view.unrecognized_list.configure(state="normal")
        self.view.unrecognized_list.delete("1.0", "end")
        self.view.unrecognized_list.configure(state="disabled")

        # Reset contadores
        self.view.validated_label.configure(text="📄 Arquivos Validados (0)")
        self.view.unrecognized_label.configure(text="❓ Arquivos Não Reconhecidos (0)")

        # Reset progresso
        self.view.progress_bar.set(0)

        # Limpa estado
        self.last_validation_result = None

        self._log_message("🧹 Resultados limpos")
