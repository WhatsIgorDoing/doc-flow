"""
Gerenciador de banco de dados SQLite usando Repository Pattern.
Implementa Store-and-Forward para sincronização.
"""
from typing import List, Optional
from datetime import datetime
import uuid

from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.logger import app_logger
from app.domain.models import Event, Session as AppSession, SystemInfo, ValidatedDocument
from app.core.constants import EventType, SyncStatus
from app.domain.entities import DocumentFile


class DatabaseManager:
    """Gerenciador do banco de dados local."""
    
    def __init__(self):
        db_path = settings.get_database_path()
        self.engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self._initialized = False
    
    def init_db(self) -> None:
        """Inicializa o banco de dados criando todas as tabelas."""
        if self._initialized:
            return
        
        SQLModel.metadata.create_all(self.engine)
        self._initialized = True
        app_logger.info("Database initialized", extra={"db_path": str(settings.get_database_path())})
    
    def create_session(self, device_id: str, session_id: str, app_version: str, 
                      os_name: str, os_version: str, memory_mb: int) -> AppSession:
        """
        Cria uma nova sessão de uso.
        
        Args:
            device_id: ID único do dispositivo
            session_id: ID único da sessão
            app_version: Versão do app
            os_name: Nome do SO
            os_version: Versão do SO
            memory_mb: Memória disponível em MB
            
        Returns:
            Sessão criada
        """
        session = AppSession(
            session_id=session_id,
            device_id=device_id,
            app_version=app_version,
            os_name=os_name,
            os_version=os_version,
            memory_mb=memory_mb
        )
        
        with Session(self.engine) as db:
            db.add(session)
            db.commit()
            db.refresh(session)
        
        app_logger.info("Session created", extra={"session_id": session_id})
        self.current_session_id = session_id
        return session

    @property
    def session_id(self) -> str:
        """Retorna o ID da sessão atual ou gera um erro/novo se não existir."""
        if not hasattr(self, 'current_session_id') or not self.current_session_id:
            # Em caso de uso fora do lifecycle normal (ex: testes), retorna um dummy ou erro
            # Para segurança, vamos retornar None e deixar quem chama tratar
            return "unknown_session"
        return self.current_session_id
    
    def log_event(self, session_id: str, device_id: str, event_type: EventType,
                  duration_ms: Optional[int] = None, files_processed: Optional[int] = None,
                  error_message: Optional[str] = None, error_stack: Optional[str] = None) -> Event:
        """
        Registra um evento de telemetria.
        
        Args:
            session_id: ID da sessão
            device_id: ID do dispositivo
            event_type: Tipo do evento
            duration_ms: Duração em milissegundos
            files_processed: Quantidade de arquivos processados
            error_message: Mensagem de erro
            error_stack: Stack trace do erro
            
        Returns:
            Evento criado
        """
        event = Event(
            event_id=str(uuid.uuid4()),
            session_id=session_id,
            device_id=device_id,
            event_type=event_type,
            duration_ms=duration_ms,
            files_processed=files_processed,
            error_message=error_message,
            error_stack=error_stack
        )
        
        with Session(self.engine) as db:
            db.add(event)
            db.commit()
            db.refresh(event)
        
        app_logger.debug("Event logged", extra={"event_type": event_type, "event_id": event.event_id})
        return event
    
    def get_pending_events(self, limit: int = 100) -> List[Event]:
        """
        Retorna eventos pendentes de sincronização.
        
        Args:
            limit: Quantidade máxima de eventos
            
        Returns:
            Lista de eventos pendentes
        """
        with Session(self.engine) as db:
            statement = select(Event).where(
                Event.sync_status == SyncStatus.PENDING
            ).limit(limit)
            events = db.exec(statement).all()
            return list(events)
    
    def mark_events_synced(self, event_ids: List[str]) -> int:
        """
        Marca eventos como sincronizados.
        
        Args:
            event_ids: Lista de IDs de eventos
            
        Returns:
            Quantidade de eventos atualizados
        """
        with Session(self.engine) as db:
            statement = select(Event).where(Event.event_id.in_(event_ids))
            events = db.exec(statement).all()
            
            for event in events:
                event.sync_status = SyncStatus.SYNCED
                event.synced_at = datetime.utcnow()
                db.add(event)
            
            db.commit()
            return len(events)
    
    def mark_events_failed(self, event_ids: List[str]) -> int:
        """
        Marca eventos como falha na sincronização.
        
        Args:
            event_ids: Lista de IDs de eventos
            
        Returns:
            Quantidade de eventos atualizados
        """
        with Session(self.engine) as db:
            statement = select(Event).where(Event.event_id.in_(event_ids))
            events = db.exec(statement).all()
            
            for event in events:
                event.sync_status = SyncStatus.FAILED
                event.sync_attempts += 1
                event.last_sync_attempt = datetime.utcnow()
                db.add(event)
            
            db.commit()
            return len(events)
    
    def get_pending_count(self) -> int:
        """Retorna a quantidade de eventos pendentes."""
        with Session(self.engine) as db:
            statement = select(Event).where(Event.sync_status == SyncStatus.PENDING)
            return len(db.exec(statement).all())
    
    def set_system_info(self, key: str, value: str) -> None:
        """Armazena informação do sistema."""
        with Session(self.engine) as db:
            statement = select(SystemInfo).where(SystemInfo.key == key)
            info = db.exec(statement).first()
            
            if info:
                info.value = value
                info.updated_at = datetime.utcnow()
            else:
                info = SystemInfo(key=key, value=value)
            
            db.add(info)
            db.commit()
    
            info = db.exec(statement).first()
            return info.value if info else None

    def save_validated_documents(self, session_id: str, documents: List[DocumentFile]) -> int:
        """
        Salva uma lista de documentos validados.
        
        Args:
            session_id: ID da sessão atual
            documents: Lista de DocumentFile validados
            
        Returns:
            Quantidade de documentos salvos
        """
        if not documents:
            return 0
            
        # Primeiro limpa validações anteriores desta sessão para evitar duplicatas/confusão
        self.clear_validated_documents(session_id)
        
        validated_docs = []
        for doc in documents:
            # Extrai metadados se houver manifesto associado
            doc_code = None
            revision = None
            title = None
            
            if doc.associated_manifest_item:
                doc_code = doc.associated_manifest_item.document_code
                revision = doc.associated_manifest_item.revision
                title = doc.associated_manifest_item.title
                
            validated_doc = ValidatedDocument(
                session_id=session_id,
                path=str(doc.path),
                filename=doc.path.name,
                size_bytes=doc.size_bytes,
                status=doc.status.value, # Enum value str
                document_code=doc_code,
                revision=revision,
                title=title
            )
            validated_docs.append(validated_doc)
            
        with Session(self.engine) as db:
            for v_doc in validated_docs:
                db.add(v_doc)
            db.commit()
            
        app_logger.info(f"Saved {len(validated_docs)} validated documents", extra={"session_id": session_id})
        return len(validated_docs)

    def get_validated_documents(self, session_id: str) -> List[ValidatedDocument]:
        """
        Recupera documentos validados da sessão.
        
        Args:
            session_id: ID da sessão
            
        Returns:
            Lista de ValidatedDocument
        """
        with Session(self.engine) as db:
            statement = select(ValidatedDocument).where(
                ValidatedDocument.session_id == session_id
            )
            return list(db.exec(statement).all())

    def clear_validated_documents(self, session_id: str) -> None:
        """
        Limpa documentos validados anteriores da sessão.
        
        Args:
            session_id: ID da sessão
        """
        with Session(self.engine) as db:
            statement = select(ValidatedDocument).where(
                ValidatedDocument.session_id == session_id
            )
            results = db.exec(statement).all()
            for res in results:
                db.delete(res)
            db.commit()


# Singleton global
db_manager = DatabaseManager()
