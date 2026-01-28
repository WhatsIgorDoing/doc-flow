import pytest
import uuid
from pathlib import Path
from sqlmodel import Session, select

from app.infrastructure.database import DatabaseManager
from app.domain.entities import DocumentFile, DocumentStatus, ManifestItem
from app.domain.models import ValidatedDocument

# Fixture para banco de dados isolado
@pytest.fixture
def db_manager(tmp_path):
    # Sobrescreve database path para usar arquivo temporario ou memoria
    # Mas como DatabaseManager usa settings singleton, vamos usar :memory: se possivel
    # ou monkeypatch settings.
    
    from app.core.config import settings
    original_db_name = settings.DATABASE_NAME
    
    # Use um arquivo unico no tmp_path para evitar conflitos
    test_db = tmp_path / "test_docflow.db"
    settings.DATABASE_NAME = str(test_db.name)
    # settings.APP_DATA_DIR = str(tmp_path) # Cuidado com efeitos colaterais
    
    # Importante: DatabaseManager é singleton. Precisamos reinicializar ou usar uma instancia nova
    # Mas o codigo usa o singleton global importado.
    
    # Vamos instanciar um NOVO DatabaseManager apontando para o banco de teste
    # E monkeypatchar o global db_manager onde ele é usado? Não, unit test devia testar a classe.
    
    # Melhor refatorar DatabaseManager para aceitar url no init?
    # Ele pega de settings.get_database_path().
    
    # Hack: Patch get_database_path do settings object
    with pytest.MonkeyPatch.context() as m:
        m.setattr(settings, "get_database_path", lambda: test_db)
        
        manager = DatabaseManager() 
        manager.init_db()
        yield manager
        
        # Cleanup (SQLite fecha no GC, mas arquivo pode persistir)
        manager.engine.dispose()


def test_save_and_get_validated_documents(db_manager):
    session_id = str(uuid.uuid4())
    
    # Preparar dados
    doc1 = DocumentFile(
        path=Path("c:/docs/file1.pdf"), 
        size_bytes=1024,
        status=DocumentStatus.VALIDATED,
        associated_manifest_item=ManifestItem(
            document_code="DOC-001",
            revision="A",
            title="Design Doc"
        )
    )
    
    doc2 = DocumentFile(
        path=Path("c:/docs/file2.pdf"), 
        size_bytes=2048,
        status=DocumentStatus.UNRECOGNIZED
    )
    
    documents = [doc1, doc2]
    
    # Salvar
    count = db_manager.save_validated_documents(session_id, documents)
    assert count == 2
    
    # Recuperar
    saved_docs = db_manager.get_validated_documents(session_id)
    assert len(saved_docs) == 2
    
    # Verificar integridade doc1
    v_doc1 = next(d for d in saved_docs if d.filename == "file1.pdf")
    assert v_doc1.session_id == session_id
    assert v_doc1.path == str(doc1.path)
    assert v_doc1.size_bytes == 1024
    assert v_doc1.status == DocumentStatus.VALIDATED.value
    assert v_doc1.document_code == "DOC-001"
    assert v_doc1.revision == "A"
    assert v_doc1.title == "Design Doc"
    
    # Verificar integridade doc2
    v_doc2 = next(d for d in saved_docs if d.filename == "file2.pdf")
    assert v_doc2.document_code is None


def test_clear_validated_documents(db_manager):
    session_id = str(uuid.uuid4())
    documents = [
        DocumentFile(Path("c:/test.pdf"), 100, DocumentStatus.VALIDATED)
    ]
    
    # Salvar e Verificar
    db_manager.save_validated_documents(session_id, documents)
    assert len(db_manager.get_validated_documents(session_id)) == 1
    
    # Limpar
    db_manager.clear_validated_documents(session_id)
    assert len(db_manager.get_validated_documents(session_id)) == 0


def test_save_overwrites_previous_session_data(db_manager):
    """Garante que salvar novamente para a mesma sessão limpa os anteriores."""
    session_id = str(uuid.uuid4())
    
    docs_batch1 = [DocumentFile(Path("c:/1.pdf"), 10, DocumentStatus.VALIDATED)]
    db_manager.save_validated_documents(session_id, docs_batch1)
    
    docs_batch2 = [DocumentFile(Path("c:/2.pdf"), 20, DocumentStatus.VALIDATED)]
    db_manager.save_validated_documents(session_id, docs_batch2)
    
    current = db_manager.get_validated_documents(session_id)
    assert len(current) == 1
    assert current[0].filename == "2.pdf"
