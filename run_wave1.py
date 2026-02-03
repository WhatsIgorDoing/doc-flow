"""
Launcher script para Wave 1 - Backend minimalista.
Configura PYTHONPATH e inicia o app com main_wave1.py
"""

import sys
from pathlib import Path

# Resolve o diretório raiz do projeto
root_dir = Path(__file__).parent
sys.path.insert(0, str(root_dir))

# Importa e executa o main da Wave 1
if __name__ == "__main__":
    from app.main import run

    run()
