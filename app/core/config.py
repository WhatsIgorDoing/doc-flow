"""
Configuração centralizada usando Pydantic Settings.
Carrega variáveis de ambiente do arquivo .env com defaults seguros para desenvolvimento.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    """Configurações globais da aplicação com defaults seguros."""

    # Application
    APP_NAME: str = "SAD_Validator"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    SECRET_KEY: str = "dev-secret-key-change-in-production"  # Para sessões NiceGUI

    # Supabase (defaults seguros para dev - sem conexão real)
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_KEY: str = "your-anon-key-here"
    SUPABASE_ENABLED: bool = False  # Desabilitado por padrão em dev

    # Database
    DATABASE_PATH: str = "./data/sad_app.db"
    DATABASE_ECHO: bool = False  # SQL logging

    # Sync Worker
    SYNC_INTERVAL_SECONDS: int = 60
    SYNC_BATCH_SIZE: int = 100
    SYNC_RETRY_MAX_ATTEMPTS: int = 3
    SYNC_ENABLED: bool = True

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_PATH: str = "./logs"
    LOG_FORMAT: str = "json"  # ou "text"

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8080
    RELOAD: bool = False  # Hot reload (apenas dev)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignora variáveis de ambiente extras
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

    @property
    def is_production(self) -> bool:
        """Verifica se está em ambiente de produção."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def is_development(self) -> bool:
        """Verifica se está em ambiente de desenvolvimento."""
        return self.ENVIRONMENT.lower() == "development"


# Singleton global
settings = Settings()
