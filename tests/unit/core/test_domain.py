from pathlib import Path

from src.sad_app_v2.core.domain import (
    DocumentFile,
    DocumentGroup,
    DocumentStatus,
    ManifestItem,
    OutputLot,
)


def test_manifest_item_creation():
    """
    Verifica se um objeto ManifestItem é criado corretamente com os
    atributos esperados.
    """
    code = "DOC-001"
    revision = "A"
    title = "Teste de Documento"
    metadata = {"disciplina": "ENGENHARIA"}

    item = ManifestItem(
        document_code=code,
        revision=revision,
        title=title,
        metadata=metadata,
    )

    assert item.document_code == code
    assert item.revision == revision
    assert item.title == title
    assert item.metadata["disciplina"] == "ENGENHARIA"


def test_document_file_creation_defaults():
    """
    Verifica se um objeto DocumentFile é criado com os valores padrão corretos,
    especialmente o status.
    """
    test_path = Path("C:/temp/test.pdf")
    test_size = 1024

    doc_file = DocumentFile(path=test_path, size_bytes=test_size)

    assert doc_file.path == test_path
    assert doc_file.size_bytes == test_size
    assert doc_file.status == DocumentStatus.UNVALIDATED
    assert doc_file.associated_manifest_item is None


def test_document_file_path_conversion():
    """
    Verifica se a classe DocumentFile converte automaticamente uma string
    de caminho para um objeto Path, conforme definido no __post_init__.
    """
    path_str = "C:/temp/outro_teste.docx"

    doc_file = DocumentFile(path=path_str, size_bytes=2048)

    # O teste chave: verificar se o tipo do atributo é Path, e não str.
    assert isinstance(doc_file.path, Path)
    assert str(doc_file.path) == path_str.replace("/", "\\")  # Normalização do Windows


def test_document_group_creation():
    """
    Verifica se um DocumentGroup é criado corretamente e calcula o tamanho total.
    """
    document_code = "DOC-001"
    file1 = DocumentFile(path="test1.pdf", size_bytes=1000)
    file2 = DocumentFile(path="test2.dwg", size_bytes=2000)

    group = DocumentGroup(document_code=document_code, files=[file1, file2])

    assert group.document_code == document_code
    assert len(group.files) == 2
    assert group.total_size_bytes == 3000


def test_output_lot_creation():
    """
    Verifica se um OutputLot é criado corretamente e calcula o tamanho total.
    """
    lot_name = "LOTE-001"
    file1 = DocumentFile(path="test1.pdf", size_bytes=500)
    file2 = DocumentFile(path="test2.docx", size_bytes=1500)

    # Criar um grupo de documentos
    group = DocumentGroup(document_code="group1", files=[file1, file2])

    lot = OutputLot(lot_name=lot_name, groups=[group])

    assert lot.lot_name == lot_name
    assert len(lot.files) == 2
    assert lot.total_size_bytes == 2000
