"""
Cliente Supabase para sincronização de telemetria.
"""

from typing import List, Dict, Any, Optional
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = object
    print("Supabase library not found. Sync features will fail if used.")

from app.core.config import settings
from app.core.logger import app_logger
from app.core.constants import SUPABASE_TABLE_EVENTS
from app.domain.models import Event


class SupabaseClient:
    """Cliente para interação com Supabase."""

    def __init__(self):
        self._client: Optional[Client] = None

    @property
    def client(self) -> Client:
        """Lazy loading do cliente Supabase."""
        if self._client is None:
            try:
                self._client = create_client(
                    settings.SUPABASE_URL, settings.SUPABASE_KEY
                )
            except Exception as e:
                app_logger.error(f"Failed to initialize Supabase client: {e}")
                raise
        return self._client

    def upload_events(self, events: List[Event]) -> tuple[bool, List[str]]:
        """
        Envia eventos para o Supabase.

        Args:
            events: Lista de eventos para enviar

        Returns:
            Tupla (sucesso, lista de event_ids enviados)
        """
        if not events:
            return True, []

        try:
            # Converte eventos para dicionários
            events_data = [
                {
                    "event_id": event.event_id,
                    "session_id": event.session_id,
                    "device_id": event.device_id,
                    "event_type": event.event_type,
                    "timestamp": event.timestamp.isoformat(),
                    "duration_ms": event.duration_ms,
                    "files_processed": event.files_processed,
                    "error_message": event.error_message,
                    "error_stack": event.error_stack,
                }
                for event in events
            ]

            # Envia para Supabase
            response = (
                self.client.table(SUPABASE_TABLE_EVENTS).insert(events_data).execute()
            )

            event_ids = [event.event_id for event in events]
            app_logger.info(
                f"Events uploaded successfully", extra={"count": len(events)}
            )

            return True, event_ids

        except Exception as e:
            app_logger.error(
                f"Failed to upload events: {e}", extra={"count": len(events)}
            )
            return False, []

    def test_connection(self) -> bool:
        """
        Testa a conexão com o Supabase.

        Returns:
            True se a conexão estiver OK
        """
        try:
            # Tenta fazer uma query simples
            self.client.table(SUPABASE_TABLE_EVENTS).select("event_id").limit(
                1
            ).execute()
            return True
        except Exception as e:
            app_logger.error(f"Supabase connection test failed: {e}")
            return False


# Singleton global
supabase_client = SupabaseClient()
