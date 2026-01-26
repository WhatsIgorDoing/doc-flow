from pathlib import Path

from src.sad_app_v2.core.domain import DocumentFile
from src.sad_app_v2.infrastructure.extraction import ProfiledExtractorService


def test_extract_code_from_pdf():
    """
    Verifica se o serviço consegue extrair o código de um PDF de exemplo
    usando o perfil RIR.
    """
    # Setup
    config_path = Path("config/patterns.yaml")
    extractor = ProfiledExtractorService(config_path)

    pdf_fixture = DocumentFile(
        path=Path("tests/fixtures/documento_rir.pdf"), size_bytes=100
    )
    expected_code = "CZ6_RNEST_U22_3.1.1.1_CVL_RIR_B-22026A"

    # Execução
    text = extractor.extract_text(pdf_fixture, "RIR")
    found_code = extractor.find_code(text, "RIR")

    # Verificação
    assert found_code is not None
    assert found_code.strip() == expected_code


def test_extract_code_from_docx():
    """
    Verifica se o serviço consegue extrair o código de um DOCX de exemplo
    usando o perfil RIR.
    """
    # Setup
    config_path = Path("config/patterns.yaml")
    extractor = ProfiledExtractorService(config_path)

    docx_fixture = DocumentFile(
        path=Path("tests/fixtures/documento_rir.docx"), size_bytes=100
    )
    expected_code = "CZ6_RNEST_U22_3.1.1.1_CVL_RIR_B-22026A"

    # Execução
    text = extractor.extract_text(docx_fixture, "RIR")
    found_code = extractor.find_code(text, "RIR")

    # Verificação
    assert found_code is not None
    assert found_code.strip() == expected_code
