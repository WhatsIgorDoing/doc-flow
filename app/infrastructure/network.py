"""
Utilitários para verificação de conectividade de rede.
"""
import httpx
from app.core.constants import NETWORK_CHECK_TIMEOUT, ConnectionStatus
from app.core.logger import app_logger


async def check_internet_connection() -> bool:
    """
    Verifica se há conexão com a internet.
    
    Returns:
        True se houver conexão, False caso contrário
    """
    try:
        async with httpx.AsyncClient(timeout=NETWORK_CHECK_TIMEOUT) as client:
            response = await client.get("https://www.google.com")
            return response.status_code == 200
    except Exception as e:
        app_logger.debug(f"Internet check failed: {e}")
        return False


def check_internet_connection_sync() -> bool:
    """
    Versão síncrona da verificação de internet.
    
    Returns:
        True se houver conexão, False caso contrário
    """
    try:
        with httpx.Client(timeout=NETWORK_CHECK_TIMEOUT) as client:
            response = client.get("https://www.google.com")
            return response.status_code == 200
    except Exception:
        return False
