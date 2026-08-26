"""
conftest.py
Garante que a pasta server/ (onde ficam main.py e app/) está no sys.path
ao rodar os testes, independente de onde o pytest for chamado ou de
outros arquivos pytest.ini existirem em pastas acima (ex: na raiz do
projeto, de outro branch do time).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
