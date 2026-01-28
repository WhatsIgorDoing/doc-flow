"""
Modelos de domínio usando SQLModel (Pydantic + SQLAlchemy).
Representam as entidades do banco de dados local.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from app.core.constants import EventType, SyncStatus


class Session(SQLModel, table=True):
    """Sessão de uso do aplicativo."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True, unique=True)
    device_id: str = Field(index=True)
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    app_version: str
    os_name: str
    os_version: str
    memory_mb: int


class Event(SQLModel, table=True):
    """Evento de telemetria."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: str = Field(index=True, unique=True)
    session_id: str = Field(index=True)
    device_id: str = Field(index=True)
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
    # Dados do evento (JSON serializado)
    duration_ms: Optional[int] = None
    files_processed: Optional[int] = None
    error_message: Optional[str] = None
    error_stack: Optional[str] = None
    
    # Controle de sincronização
    sync_status: SyncStatus = Field(default=SyncStatus.PENDING)
    sync_attempts: int = Field(default=0)
    last_sync_attempt: Optional[datetime] = None
    synced_at: Optional[datetime] = None


class SystemInfo(SQLModel, table=True):
    """Informações do sistema (cache local)."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    key: str = Field(index=True, unique=True)
    value: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ValidatedDocument(SQLModel, table=True):
    """Documento validado e persistido temporariamente."""

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    
    # Dados do arquivo
    path: str
    filename: str
    size_bytes: int
    status: str  # Armazenar value do DocumentStatus
    
    # Metadados do manifesto associado (opcionais pois podem não reconhecer)
    document_code: Optional[str] = None
    revision: Optional[str] = None
    title: Optional[str] = None
    
    validated_at: datetime = Field(default_factory=datetime.utcnow)
