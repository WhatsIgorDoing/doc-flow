"""
Módulo compartilhado para lógica de nomenclatura de arquivos.
Consolida helpers que estavam duplicados em organize_lots.py e template_filler.py.
"""

from pathlib import Path


def get_filename_with_revision(original_filename: str, revision: str) -> str:
    """
    Monta o nome do arquivo com a revisão antes da extensão.
    Evita duplicação se o sufixo de revisão já existir.

    Examples:
        >>> get_filename_with_revision("arquivo.pdf", "A")
        'arquivo_A.pdf'
        >>> get_filename_with_revision("arquivo_A.pdf", "A")
        'arquivo_A.pdf'
        >>> get_filename_with_revision("arquivo", "B")
        'arquivo_B'
    """
    name_parts = original_filename.rsplit(".", 1)

    if len(name_parts) == 2:
        base_name, extension = name_parts
        if base_name.endswith(f"_{revision}"):
            return original_filename
        return f"{base_name}_{revision}.{extension}"
    else:
        if original_filename.endswith(f"_{revision}"):
            return original_filename
        return f"{original_filename}_{revision}"


def generate_unique_filename(target_path: Path) -> Path:
    """
    Gera um nome de arquivo único quando o destino já existe.
    Tenta sufixos numéricos (_001, _002, ...) até encontrar um disponível.

    Args:
        target_path: Caminho de destino desejado que já existe.

    Returns:
        Novo caminho com sufixo numérico garantidamente disponível.

    Examples:
        Se 'doc.pdf' existe:
        >>> generate_unique_filename(Path("doc.pdf"))
        Path("doc_001.pdf")
    """
    stem = target_path.stem
    suffix = target_path.suffix
    parent = target_path.parent

    for counter in range(1, 1000):
        candidate = parent / f"{stem}_{counter:03d}{suffix}"
        if not candidate.exists():
            return candidate

    # Fallback extremo: praticamente impossível chegar aqui
    import time

    ts = int(time.time())
    return parent / f"{stem}_{ts}{suffix}"
