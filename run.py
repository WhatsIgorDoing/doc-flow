"""
Script de inicialização da aplicação.
Garante que o diretório raiz esteja no PYTHONPATH.
"""

import sys
import os
from pathlib import Path

# Adiciona o diretório raiz ao PYTHONPATH
root_dir = Path(__file__).parent
sys.path.insert(0, str(root_dir))

# Muda o working directory para o diretório raiz
os.chdir(root_dir)

# Importa e executa a aplicação
from app.main import run

if __name__ == "__main__":
    run()
