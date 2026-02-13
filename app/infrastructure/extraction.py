"""
Serviços de extração de conteúdo e identificação de códigos de documentos.
Implementa IContentExtractor e ICodeExtractor de forma assíncrona.
"""

import asyncio
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import docx
import yaml
from PyPDF2 import PdfReader

from app.core.interfaces import ICodeExtractor, IContentExtractor
from app.core.logger import app_logger
from app.domain.entities import DocumentFile
from app.domain.exceptions import FileReadError


class ProfiledExtractorService(IContentExtractor, ICodeExtractor):
    """
    Implementação que extrai conteúdo e códigos de arquivos
    baseado em perfis de configuração.
    """

    def __init__(self, config_path: Path):
        self._profiles = self._load_profiles(config_path)

    def _load_profiles(self, config_path: Path) -> Dict[str, Any]:
        """Carrega os perfis de extração do arquivo YAML."""
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return yaml.safe_load(f).get("profiles", {})
        except FileNotFoundError:
            app_logger.warning(
                "Profiles config file not found", extra={"path": str(config_path)}
            )
            return {}
        except yaml.YAMLError as e:
            app_logger.error(
                "Error parsing profiles config",
                extra={"path": str(config_path), "error": str(e)},
            )
            return {}

    async def extract_text(self, file: DocumentFile, profile_id: str) -> str:
        """
        Extrai texto de um arquivo (PDF ou DOCX) de forma assíncrona.
        Usa thread pool para não bloquear o event loop durante I/O e processamento.
        """
        try:
            loop = asyncio.get_event_loop()

            if file.path.suffix.lower() == ".pdf":
                return await loop.run_in_executor(
                    None, self._extract_text_from_pdf, file.path
                )
            elif file.path.suffix.lower() == ".docx":
                return await loop.run_in_executor(
                    None, self._extract_text_from_docx, file.path
                )
            else:
                # Se o perfil precisar, podemos adicionar outros extratores (txt, etc.)
                return ""
        except Exception as e:
            app_logger.error(
                "Failed to extract text",
                extra={"file": str(file.path), "error": str(e)},
            )
            raise FileReadError(f"Falha ao ler o conteúdo de {file.path.name}: {e}")

    def _extract_text_from_pdf(self, file_path: Path) -> str:
        """Lógica específica para extração de texto de PDF (CPU intensive)."""
        text_parts = []
        with open(file_path, "rb") as f:
            reader = PdfReader(f)
            # Extrai texto de todas as páginas
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text_parts.append(extracted)
        return "".join(text_parts)

    def _extract_text_from_docx(self, file_path: Path) -> str:
        """Lógica específica para extração de texto de DOCX (CPU intensive)."""
        doc = docx.Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])

    async def find_code(self, text: str, profile_id: str) -> Optional[str]:
        """Encontra um código em um texto usando os padrões de um perfil."""
        # Operação de CPU leve, mas pode ser promovida a executor se perfis forem muito complexos
        profile = self._profiles.get(profile_id)
        if not profile or not text:
            return None

        patterns: List[str] = profile.get("patterns", [])
        for pattern in patterns:
            # re.IGNORECASE para ignorar maiúsculas/minúsculas
            # re.MULTILINE para que ^ e $ funcionem em cada linha
            try:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    # Se o padrão tem um grupo de captura (parênteses), retorna o grupo.
                    # Senão, retorna a correspondência inteira.
                    code = match.group(1) if match.groups() else match.group(0)
                    app_logger.debug(
                        "Code found",
                        extra={"code": code, "pattern": pattern, "profile": profile_id},
                    )
                    return code
            except re.error as e:
                app_logger.warning(
                    "Invalid regex pattern",
                    extra={"pattern": pattern, "error": str(e)},
                )
                continue

        return None
