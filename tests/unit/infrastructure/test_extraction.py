from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.interfaces import FileReadError
from app.domain.entities import DocumentFile
from app.infrastructure.extraction import ProfiledExtractorService


# Mocks para PdfReader e docx.Document
@pytest.fixture
def mock_pdf_reader():
    with patch("app.infrastructure.extraction.PdfReader") as mock:
        yield mock


@pytest.fixture
def mock_docx_document():
    with patch("app.infrastructure.extraction.docx.Document") as mock:
        yield mock


def test_load_profiles(tmp_path):
    """Testa o carregamento de configurações YAML."""
    config_file = tmp_path / "profiles.yaml"
    config_file.write_text(
        """
profiles:
  RIR:
    patterns:
      - 'RIR-(\\d+)'
  PID:
    patterns:
      - 'PID-(\\d+)'
    """,
        encoding="utf-8",
    )

    service = ProfiledExtractorService(config_file)
    assert "RIR" in service._profiles
    assert "PID" in service._profiles
    assert service._profiles["RIR"]["patterns"] == ["RIR-(\\d+)"]


@pytest.mark.asyncio
async def test_extract_text_pdf(mock_pdf_reader):
    """Testa extração de texto de PDF."""
    # Setup do Mock
    mock_page = MagicMock()
    mock_page.extract_text.return_value = "Conteúdo do PDF"
    mock_pdf_reader.return_value.pages = [mock_page]

    service = ProfiledExtractorService(Path("dummy_config.yaml"))
    file = DocumentFile(path=Path("test.pdf"), size_bytes=0)

    # Execução
    # Precisamos mockar o open() pois o service tenta abrir o arquivo
    with patch("builtins.open", new_callable=MagicMock):
        text = await service.extract_text(file)

    # Verificação
    assert text == "Conteúdo do PDF"


@pytest.mark.asyncio
async def test_extract_text_docx(mock_docx_document):
    """Testa extração de texto de DOCX."""
    # Setup do Mock
    mock_para = MagicMock()
    mock_para.text = "Conteúdo do DOCX"
    mock_docx_document.return_value.paragraphs = [mock_para]

    service = ProfiledExtractorService(Path("dummy_config.yaml"))
    file = DocumentFile(path=Path("test.docx"), size_bytes=0)

    # Execução
    text = await service.extract_text(file)

    # Verificação
    assert text == "Conteúdo do DOCX"


@pytest.mark.asyncio
async def test_find_code_regex(tmp_path):
    """Testa a lógica de regex para encontrar códigos."""
    config_file = tmp_path / "profiles.yaml"
    config_file.write_text(
        """
profiles:
  TEST_PROFILE:
    patterns:
      - 'CODIGO: (\\w+-\\d+)'
      - 'ALT: (\\d+)'
    """,
        encoding="utf-8",
    )

    service = ProfiledExtractorService(config_file)

    # Caso 1: Encontra no primeiro padrão
    text1 = "Texto aleatório\nCODIGO: DOC-100\nMais texto"
    code1 = await service.find_code(text1, "TEST_PROFILE")
    assert code1 == "DOC-100"

    # Caso 2: Encontra no segundo padrão
    text2 = "Apenas\nALT: 999\nFim"
    code2 = await service.find_code(text2, "TEST_PROFILE")
    assert code2 == "999"

    # Caso 3: Não encontra
    text3 = "Nada aqui"
    code3 = await service.find_code(text3, "TEST_PROFILE")
    assert code3 is None

    # Caso 4: Perfil inexistente
    code4 = await service.find_code(text1, "INVALID_PROFILE")
    assert code4 is None
