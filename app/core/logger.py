"""
Sistema de logging estruturado (JSON) para facilitar análise.
Logs locais em arquivo + stdout para debug.
"""

import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
import json
from datetime import datetime
from typing import Any

from app.core.config import settings


class JSONFormatter(logging.Formatter):
    """Formata logs em JSON estruturado."""

    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Adiciona exception info se existir
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Adiciona campos extras
        if hasattr(record, "extra_data"):
            log_data["extra"] = record.extra_data

        return json.dumps(log_data, ensure_ascii=False)


def setup_logger(name: str = "sad_app") -> logging.Logger:
    """
    Configura o logger da aplicação.

    Args:
        name: Nome do logger

    Returns:
        Logger configurado
    """
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, settings.LOG_LEVEL))

    # Remove handlers existentes para evitar duplicação
    logger.handlers.clear()

    # Handler para arquivo (JSON, rotativo)
    log_file = settings.get_log_path() / f"{name}.log"
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding="utf-8",
    )
    file_handler.setFormatter(JSONFormatter())
    logger.addHandler(file_handler)

    # Handler para console (texto legível)
    console_handler = logging.StreamHandler(sys.stdout)
    console_formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)

    return logger


# Logger global
app_logger = setup_logger()
