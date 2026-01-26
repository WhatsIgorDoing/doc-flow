"""
Worker de sincronização em background (Store-and-Forward).
Roda em asyncio e sincroniza eventos locais com Supabase.
"""
import asyncio
from datetime import datetime
from typing import Optional

from app.core.config import settings
from app.core.logger import app_logger
from app.core.constants import ConnectionStatus, SYNC_RETRY_DELAY
from app.infrastructure.database import db_manager
from app.infrastructure.supabase_client import supabase_client
from app.infrastructure.network import check_internet_connection


class SyncWorker:
    """Worker de sincronização em background."""
    
    def __init__(self):
        self.is_running = False
        self.connection_status = ConnectionStatus.OFFLINE
        self.last_sync_time: Optional[datetime] = None
        self.pending_count = 0
        self._task: Optional[asyncio.Task] = None
    
    async def start(self) -> None:
        """Inicia o worker de sincronização."""
        if self.is_running:
            app_logger.warning("Sync worker already running")
            return
        
        self.is_running = True
        self._task = asyncio.create_task(self._sync_loop())
        app_logger.info("Sync worker started")
    
    async def stop(self) -> None:
        """Para o worker de sincronização."""
        if not self.is_running:
            return
        
        self.is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        
        app_logger.info("Sync worker stopped")
    
    async def _sync_loop(self) -> None:
        """Loop principal de sincronização."""
        while self.is_running:
            try:
                await self._sync_cycle()
            except Exception as e:
                app_logger.error(f"Sync cycle error: {e}", exc_info=True)
            
            # Aguarda o intervalo configurado
            await asyncio.sleep(settings.SYNC_INTERVAL_SECONDS)
    
    async def _sync_cycle(self) -> None:
        """Executa um ciclo de sincronização."""
        # Atualiza contagem de pendentes
        self.pending_count = db_manager.get_pending_count()
        
        # Verifica conexão
        self.connection_status = ConnectionStatus.CHECKING
        has_internet = await check_internet_connection()
        
        if not has_internet:
            self.connection_status = ConnectionStatus.OFFLINE
            app_logger.debug("No internet connection, skipping sync")
            return
        
        self.connection_status = ConnectionStatus.ONLINE
        
        # Se não há eventos pendentes, pula
        if self.pending_count == 0:
            app_logger.debug("No pending events to sync")
            return
        
        # Busca eventos pendentes
        pending_events = db_manager.get_pending_events(limit=settings.SYNC_BATCH_SIZE)
        
        if not pending_events:
            return
        
        app_logger.info(f"Syncing {len(pending_events)} events")
        
        # Tenta enviar para Supabase
        success, synced_ids = supabase_client.upload_events(pending_events)
        
        if success and synced_ids:
            # Marca como sincronizados
            db_manager.mark_events_synced(synced_ids)
            self.last_sync_time = datetime.utcnow()
            app_logger.info(f"Successfully synced {len(synced_ids)} events")
        else:
            # Marca como falha (mas não remove)
            event_ids = [e.event_id for e in pending_events]
            db_manager.mark_events_failed(event_ids)
            app_logger.warning(f"Failed to sync {len(pending_events)} events")
    
    async def force_sync(self) -> bool:
        """
        Força uma sincronização imediata.
        
        Returns:
            True se sincronizou com sucesso
        """
        try:
            await self._sync_cycle()
            return self.connection_status == ConnectionStatus.ONLINE
        except Exception as e:
            app_logger.error(f"Force sync failed: {e}")
            return False
    
    def get_status(self) -> dict:
        """
        Retorna o status atual do worker.
        
        Returns:
            Dicionário com status
        """
        return {
            "is_running": self.is_running,
            "connection_status": self.connection_status,
            "pending_count": self.pending_count,
            "last_sync_time": self.last_sync_time.isoformat() if self.last_sync_time else None,
        }


# Singleton global
sync_worker = SyncWorker()
