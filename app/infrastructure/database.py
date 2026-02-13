"""
Gerenciador de banco de dados SQLite usando Repository Pattern.
"""

from typing import List

from sqlmodel import SQLModel, create_engine, Session, select
from sqlalchemy.pool import StaticPool

from app.core.config import settings
from app.core.logger import app_logger
from app.domain.models import ValidatedDocument
from app.domain.entities import DocumentFile


class DatabaseManager:
    """Gerenciador do banco de dados local."""

    def __init__(self):
        db_path = settings.get_database_path()
        self.engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self._initialized = False
        self.current_session_id = "default_session"

    def init_db(self) -> None:
        """Inicializa o banco de dados criando todas as tabelas."""
        if self._initialized:
            return

        SQLModel.metadata.create_all(self.engine)
        self._initialized = True
        app_logger.info(
            "Database initialized", extra={"db_path": str(settings.get_database_path())}
        )

    @property
    def session_id(self) -> str:
        """Retorna o ID da sessão atual."""
        return self.current_session_id

    def save_validated_documents(
        self, session_id: str, documents: List[DocumentFile]
    ) -> int:
        """
        Salva uma lista de documentos validados.

        Args:
            session_id: ID da sessão atual
            documents: Lista de DocumentFile validados

        Returns:
            Quantidade de documentos salvos
        """
        if not documents:
            return 0

        # Primeiro limpa validações anteriores desta sessão para evitar duplicatas
        self.clear_validated_documents(session_id)

        validated_docs = []
        for doc in documents:
            doc_code = None
            revision = None
            title = None

            if doc.associated_manifest_item:
                doc_code = doc.associated_manifest_item.document_code
                revision = doc.associated_manifest_item.revision
                title = doc.associated_manifest_item.title

            validated_doc = ValidatedDocument(
                session_id=session_id,
                path=str(doc.path),
                filename=doc.path.name,
                size_bytes=doc.size_bytes,
                status=doc.status.value,
                document_code=doc_code,
                revision=revision,
                title=title,
            )
            validated_docs.append(validated_doc)

        with Session(self.engine) as db:
            for v_doc in validated_docs:
                db.add(v_doc)
            db.commit()

        app_logger.info(
            f"Saved {len(validated_docs)} validated documents",
            extra={"session_id": session_id},
        )
        return len(validated_docs)

    def get_validated_documents(self, session_id: str) -> List[ValidatedDocument]:
        """
        Recupera documentos validados da sessão.

        Args:
            session_id: ID da sessão

        Returns:
            Lista de ValidatedDocument
        """
        with Session(self.engine) as db:
            statement = select(ValidatedDocument).where(
                ValidatedDocument.session_id == session_id
            )
            return list(db.exec(statement).all())

    def clear_validated_documents(self, session_id: str) -> None:
        """
        Limpa documentos validados anteriores da sessão.

        Args:
            session_id: ID da sessão
        """
        with Session(self.engine) as db:
            statement = select(ValidatedDocument).where(
                ValidatedDocument.session_id == session_id
            )
            results = db.exec(statement).all()
            for res in results:
                db.delete(res)
            db.commit()


# Singleton global
db_manager = DatabaseManager()
