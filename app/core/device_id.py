"""
Gerador de Device ID único e persistente.
Cria um UUID na primeira execução e armazena localmente.
"""
import uuid
from pathlib import Path


class DeviceIDManager:
    """Gerencia o Device ID único da instalação."""
    
    def __init__(self, storage_path: str = "./data/.device_id"):
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
    
    def get_device_id(self) -> str:
        """
        Retorna o Device ID. Se não existir, cria um novo.
        
        Returns:
            str: UUID único do dispositivo
        """
        if self.storage_path.exists():
            return self.storage_path.read_text(encoding="utf-8").strip()
        
        device_id = str(uuid.uuid4())
        self.storage_path.write_text(device_id, encoding="utf-8")
        return device_id
    
    def reset_device_id(self) -> str:
        """
        Força a criação de um novo Device ID.
        Útil para testes ou reinstalação.
        
        Returns:
            str: Novo UUID do dispositivo
        """
        if self.storage_path.exists():
            self.storage_path.unlink()
        return self.get_device_id()


# Singleton global
device_manager = DeviceIDManager()
