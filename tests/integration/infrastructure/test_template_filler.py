from pathlib import Path

import openpyxl
import pytest

from src.sad_app_v2.core.domain import DocumentFile, DocumentGroup, ManifestItem
from src.sad_app_v2.core.interfaces import TemplateNotFoundError
from src.sad_app_v2.infrastructure.file_system import SafeFileSystemManager
from src.sad_app_v2.infrastructure.template_filler import OpenpyxlTemplateFiller


def test_fill_and_save_creates_and_fills_correctly(tmp_path):
    """
    Verifica se o serviço copia o template e o preenche com os dados corretos.
    """
    # Setup
    # 1. Criar dados de teste
    manifest_item = ManifestItem(
        document_code="DOC-FINAL",
        revision="C",
        title="Teste Final",
        metadata={"DISCIPLINA": "TESTES", "PROPÓSITO": "Verificação"},
    )
    file_pdf = DocumentFile(
        Path("DOC-FINAL_C.pdf"), 100, associated_manifest_item=manifest_item
    )
    file_dwg = DocumentFile(
        Path("DOC-FINAL_C.dwg"), 200, associated_manifest_item=manifest_item
    )
    group = DocumentGroup(document_code="DOC-FINAL", files=[file_pdf, file_dwg])

    # 2. Definir caminhos
    template_path = Path("tests/fixtures/template_exemplo.xlsx")
    output_path = tmp_path / "manifesto_final.xlsx"

    # 3. Instanciar os serviços
    file_manager = SafeFileSystemManager()
    filler = OpenpyxlTemplateFiller(file_manager)

    # Execução
    filler.fill_and_save(template_path, output_path, [group])

    # Verificação
    # 1. O arquivo de saída existe?
    assert output_path.exists()

    # 2. O conteúdo está correto?
    workbook = openpyxl.load_workbook(output_path)
    sheet = workbook.active

    # Verifica cabeçalhos (permaneceram intactos?) - nova estrutura
    assert sheet["A1"].value == "DOCUMENTO"
    assert sheet["B1"].value == "REVISÃO"
    assert sheet["C1"].value == "TÍTULO"
    assert sheet["D1"].value == "ARQUIVO"

    # Verifica a primeira linha de dados (para o PDF) - nova estrutura
    assert sheet["A2"].value == "DOC-FINAL"  # DOCUMENTO
    assert sheet["B2"].value == "C"  # REVISÃO
    assert sheet["C2"].value == "Teste Final"  # TÍTULO
    assert sheet["D2"].value == "DOC-FINAL_C.pdf"  # ARQUIVO
    assert sheet["F2"].value == "TESTES"  # DISCIPLINA

    # Verifica a segunda linha de dados (para o DWG) - nova estrutura
    assert sheet["A3"].value == "DOC-FINAL"  # DOCUMENTO
    assert sheet["B3"].value == "C"  # REVISÃO
    assert sheet["C3"].value == "Teste Final"  # TÍTULO
    assert sheet["D3"].value == "DOC-FINAL_C.dwg"  # ARQUIVO
    assert sheet["H3"].value == "Verificação"  # PROPÓSITO


def test_fill_and_save_raises_error_for_missing_template(tmp_path):
    """
    Verifica se o serviço levanta exceção para template inexistente.
    """
    # Setup
    template_path = Path("arquivo_inexistente.xlsx")
    output_path = tmp_path / "saida.xlsx"
    file_manager = SafeFileSystemManager()
    filler = OpenpyxlTemplateFiller(file_manager)

    # Verificação
    with pytest.raises(TemplateNotFoundError):
        filler.fill_and_save(template_path, output_path, [])
