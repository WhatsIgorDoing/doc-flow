from pathlib import Path
from typing import List

import openpyxl

from ..core.domain import ManifestItem
from ..core.interfaces import IManifestRepository, ManifestReadError


class ExcelManifestRepository(IManifestRepository):
    """Implementação concreta para ler manifestos de arquivos Excel."""

    def load_from_file(self, file_path: Path) -> List[ManifestItem]:
        try:
            workbook = openpyxl.load_workbook(file_path, read_only=True)
            sheet = workbook.active

            items: List[ManifestItem] = []

            # Itera sobre as linhas, pulando o cabeçalho (min_row=2)
            for row in sheet.iter_rows(min_row=2, values_only=True):
                # Ignora linhas vazias
                if not any(row):
                    continue

                # Mapeamento fixo de colunas. A=0, B=1, etc.
                document_code = row[0]
                revision = str(row[1])  # Garante que a revisão seja string
                title = row[2]

                # Coleta metadados extras a partir da coluna D (índice 3)
                # Pega os nomes das colunas do cabeçalho
                header = [cell.value for cell in sheet[1]]
                metadata = {
                    header[i]: row[i]
                    for i in range(3, len(row))
                    if i < len(header)  # Garante que não leia além do cabeçalho
                }

                items.append(
                    ManifestItem(
                        document_code=document_code,
                        revision=revision,
                        title=title,
                        metadata=metadata,
                    )
                )
            return items

        except FileNotFoundError:
            raise ManifestReadError(f"Arquivo manifesto não encontrado em: {file_path}")
        except Exception as e:
            # Captura outras exceções (formato inválido, etc.)
            raise ManifestReadError(f"Erro ao ler o arquivo manifesto: {e}")
