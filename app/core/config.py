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
    SECRET_KEY: str = ""  # OBRIGATÓRIO: Definir via .env (gerar com: python -c "import secrets; print(secrets.token_urlsafe(32))")

    # Database
    DATABASE_PATH: str = "./data/sad_app.db"
    DATABASE_ECHO: bool = False  # SQL logging

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_PATH: str = "./logs"
    LOG_FORMAT: str = "json"  # ou "text"

    # Server
    HOST: str = "127.0.0.1"
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

    def validate_secret_key(self) -> None:
        """
        Valida que SECRET_KEY está configurado corretamente.

        Raises:
            ValueError: Se SECRET_KEY não está configurado ou é inseguro
        """
        # Lista de valores inseguros conhecidos
        INSECURE_KEYS = [
            "",
            "dev-secret-key-change-in-production",
            "your-secret-key-here",
            "CHANGE_ME_IN_PRODUCTION",
            "secret",
            "password",
        ]

        if not self.SECRET_KEY:
            raise ValueError(
                "SECRET_KEY não está configurado. "
                "Defina via variável de ambiente .env. "
                'Gere uma chave segura com: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )

        if self.SECRET_KEY in INSECURE_KEYS:
            raise ValueError(
                f"SECRET_KEY está usando valor inseguro: '{self.SECRET_KEY}'. "
                "Defina uma chave segura no arquivo .env. "
                'Gere uma chave com: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )

        if self.is_production and len(self.SECRET_KEY) < 32:
            raise ValueError(
                f"SECRET_KEY muito curto para produção (mínimo 32 caracteres, atual: {len(self.SECRET_KEY)}). "
                'Gere uma chave segura com: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )


# Singleton global
settings = Settings()

# Valida SECRET_KEY na inicialização
settings.validate_secret_key()
