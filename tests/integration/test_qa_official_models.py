import pytest
import shutil
from pathlib import Path
from app.infrastructure.repositories import (
    ManifestRepository,
    FileRepository,
    FileSystemManager,
)
from app.services.validation_service import ValidationService
from app.infrastructure.database import DatabaseManager


@pytest.fixture
def official_manifest_path():
    # Caminho fixo para o modelo oficial
    path = Path(
        r"c:\Development\doc-flow\docs\modelos de planilhas\LD-5290.00-22212-91A-CZ6-001_C 04_02.xlsx"
    )
    if not path.exists():
        pytest.skip(f"Official manifest not found at {path}")
    return path


@pytest.fixture
def qa_source_dir(tmp_path):
    # Diretório temporário para arquivos dummy
    source_dir = tmp_path / "qa_source"
    source_dir.mkdir()
    return source_dir


@pytest.mark.asyncio
async def test_import_official_manifest(official_manifest_path):
    """
    Testa se o ManifestRepository consegue ler o formato da planilha oficial.
    """
    repo = ManifestRepository()
    items = await repo.load_from_file(official_manifest_path)

    assert len(items) > 0, "Deveria ter encontrado itens na planilha oficial"

    # Verifica um item específico que sabemos que existe (baseado no dump anterior)
    # Row 6 (Index 5 se 0-based no array, mas itens podem variar)
    # Procuramos pelo código "5900.0130869.25.2-CZ6-CV-QUA-0001"

    found = next(
        (i for i in items if "5900.0130869.25.2-CZ6-CV-QUA-0001" in i.document_code),
        None,
    )
    assert found is not None, "Não encontrou o item 5900.0130869.25.2-CZ6-CV-QUA-0001"
    assert found.revision == "0" or found.revision == "", (
        "Revisão incorreta"
    )  # Mock pode variar
    # O titulo na planilha é "Currículo - Qualidade..."
    assert "Currículo" in found.title or "Qualidade" in found.title


@pytest.mark.asyncio
async def test_validate_official_docs(official_manifest_path, qa_source_dir):
    """
    Testa o fluxo de validação completo usando a planilha oficial e arquivos dummy.
    """
    repo = ManifestRepository()
    items = await repo.load_from_file(official_manifest_path)

    # Criar arquivos dummy para os 3 primeiros itens encontrados
    created_files = []
    for item in items[:3]:
        # Formato esperado: Code_Rev.pdf (mas o validacao pode ser flexivel)
        # O código atual espera correspondência exata ou patterns configurados.
        # Vamos assumir Nome exato do código.pdf para teste simples

        # Limpar código de caracteres inválidos para arquivo
        safe_code = item.document_code.replace("/", "-")
        filename = f"{safe_code}.pdf"

        file_path = qa_source_dir / filename
        file_path.touch()
        created_files.append(filename)

    # Setup Service
    file_repo = FileRepository()
    db_manager = DatabaseManager()
    db_manager.init_db()  # Garantir banco em memória ou arquivo

    service = ValidationService(repo, file_repo, db_manager)

    # Executar validação
    result = await service.validate_batch(official_manifest_path, qa_source_dir)

    # Verificações
    assert result.success is True or result.validated_count > 0
    assert len(result.validated_files) == 3

    # Verificar se os arquivos criados estão na lista de validados
    validated_names = [f.path.name for f in result.validated_files]
    for name in created_files:
        assert name in validated_names
