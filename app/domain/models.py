"""
Modelos de domínio usando SQLModel (Pydantic + SQLAlchemy).
Representam as entidades do banco de dados local.
"""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


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
