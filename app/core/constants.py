"""
Constantes globais da aplicação.
"""
from enum import Enum


class EventType(str, Enum):
    """Tipos de eventos logados."""
    APP_START = "app_start"
    APP_STOP = "app_stop"
    VALIDATION_START = "validation_start"
    VALIDATION_SUCCESS = "validation_success"
    VALIDATION_ERROR = "validation_error"
    FILE_PROCESSED = "file_processed"
    SYNC_SUCCESS = "sync_success"
    SYNC_ERROR = "sync_error"
    NETWORK_ERROR = "network_error"


class SyncStatus(str, Enum):
    """Status de sincronização de eventos."""
    PENDING = "pending"
    SYNCED = "synced"
    FAILED = "failed"


class ConnectionStatus(str, Enum):
    """Status da conexão com internet."""
    ONLINE = "online"
    OFFLINE = "offline"
    CHECKING = "checking"


# Tabelas do Supabase
SUPABASE_TABLE_EVENTS = "events"
SUPABASE_TABLE_SESSIONS = "sessions"
SUPABASE_TABLE_DEVICES = "devices"

# Timeouts
NETWORK_CHECK_TIMEOUT = 5  # segundos
SYNC_RETRY_DELAY = 10  # segundos
