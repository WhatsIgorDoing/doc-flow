import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import docx
import yaml
from PyPDF2 import PdfReader

from ..core.domain import DocumentFile
from ..core.interfaces import FileReadError, ICodeExtractor, IContentExtractor


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
            # Em um sistema real, poderíamos ter um log aqui.
            return {}
        except yaml.YAMLError:
            # Erro de sintaxe no YAML
            return {}

    def extract_text(self, file: DocumentFile, profile_id: str) -> str:
        """Extrai texto de um arquivo (PDF ou DOCX)."""
        try:
            if file.path.suffix.lower() == ".pdf":
                return self._extract_text_from_pdf(file.path)
            elif file.path.suffix.lower() == ".docx":
                return self._extract_text_from_docx(file.path)
            else:
                # Se o perfil precisar, podemos adicionar outros extratores (txt, etc.)
                return ""
        except Exception as e:
            raise FileReadError(f"Falha ao ler o conteúdo de {file.path.name}: {e}")

    def _extract_text_from_pdf(self, file_path: Path) -> str:
        """Lógica específica para extração de texto de PDF."""
        text = ""
        with open(file_path, "rb") as f:
            reader = PdfReader(f)
            # Extrai texto de todas as páginas
            for page in reader.pages:
                text += page.extract_text() or ""
        return text

    def _extract_text_from_docx(self, file_path: Path) -> str:
        """Lógica específica para extração de texto de DOCX."""
        doc = docx.Document(file_path)
        return "\n".join([para.text for para in doc.paragraphs])

    def find_code(self, text: str, profile_id: str) -> Optional[str]:
        """Encontra um código em um texto usando os padrões de um perfil."""
        profile = self._profiles.get(profile_id)
        if not profile or not text:
            return None

        patterns: List[str] = profile.get("patterns", [])
        for pattern in patterns:
            # re.IGNORECASE para ignorar maiúsculas/minúsculas
            # re.MULTILINE para que ^ e $ funcionem em cada linha
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                # Se o padrão tem um grupo de captura (parênteses), retorna o grupo.
                # Senão, retorna a correspondência inteira.
                return match.group(1) if match.groups() else match.group(0)

        return None
