"""
scripts/reset_kpis.py
Atalho direto para scripts/development/reset_kpis.py
"""
import sys
from pathlib import Path

target = Path(__file__).resolve().parent / "development" / "reset_kpis.py"
if not target.exists():
    target = Path(__file__).resolve().parents[1] / "scripts" / "development" / "reset_kpis.py"

with open(target, encoding="utf-8") as f:
    code = compile(f.read(), str(target), "exec")
    exec(code, {"__name__": "__main__", "__file__": str(target)})
