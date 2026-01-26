"""
Configuração centralizada usando Pydantic Settings.
Carrega variáveis de ambiente do arquivo .env.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """Configurações globais da aplicação."""
    
    # Application
    APP_NAME: str = "SAD_Validator"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "production"
    
    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # Database
    DATABASE_PATH: str = "./data/sad_app.db"
    
    # Sync Worker
    SYNC_INTERVAL_SECONDS: int = 60
    SYNC_BATCH_SIZE: int = 100
    SYNC_RETRY_MAX_ATTEMPTS: int = 3
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_PATH: str = "./logs"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True
    )
    
    def get_database_path(self) -> Path:
        """Retorna o caminho absoluto do banco de dados."""
        path = Path(self.DATABASE_PATH)
        path.parent.mkdir(parents=True, exist_ok=True)
        return path
    
    def get_log_path(self) -> Path:
        """Retorna o caminho absoluto dos logs."""
        path = Path(self.LOG_PATH)
        path.mkdir(parents=True, exist_ok=True)
        return path


# Singleton global
settings = Settings()
