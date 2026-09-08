"""
scripts/reset_local_data.py
Reseta todos os dados locais para testar a aplicação do zero absoluto:
1. Apaga o banco SQLite local (dashboard.db)
2. Limpa os anexos baixados em rpa_email/resources/attachments
3. Apaga o banco de histórico do RPA (api_email_history.db)
4. Remove logs e temporários
5. Executa as migrations do Alembic no novo banco vazio
6. Cria os perfis padrão (ADMIN)
7. Cria o usuário inicial ADMIN para login (admin@lge.com / admin123)
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
SERVER_DIR = ROOT_DIR / "server"
ATTACHMENTS_DIR = ROOT_DIR / "rpa_email" / "resources" / "attachments"
HISTORY_DB = ROOT_DIR / "rpa_email" / "resources" / "api_email_history.db"
LOCAL_DB = ROOT_DIR / "dashboard.db"
SERVER_DB = SERVER_DIR / "dashboard.db"
AUDIT_LOG = SERVER_DIR / "audit.log"


def reset():
    print("=" * 60)
    print("LIMPEZA: INICIANDO RESET DE DADOS LOCAIS (ESTADO ZERO)")
    print("=" * 60)

    # 1. Apagar bancos SQLite
    for db in (LOCAL_DB, SERVER_DB):
        if db.exists():
            try:
                db.unlink()
                print(f"  [OK] Banco removido: {db.name}")
            except Exception as e:
                print(f"  [AVISO] Nao foi possivel remover {db}: {e}")

    # 2. Limpar historico do RPA
    if HISTORY_DB.exists():
        try:
            HISTORY_DB.unlink()
            print(f"  [OK] Historico do robo removido: {HISTORY_DB.name}")
        except Exception as e:
            print(f"  [AVISO] Nao foi possivel remover historico: {e}")

    # 3. Limpar pasta de anexos do RPA (mantendo .gitkeep)
    if ATTACHMENTS_DIR.exists():
        cleared = 0
        for item in ATTACHMENTS_DIR.iterdir():
            if item.name == ".gitkeep":
                continue
            if item.is_dir():
                shutil.rmtree(item, ignore_errors=True)
                cleared += 1
            else:
                try:
                    item.unlink()
                    cleared += 1
                except Exception:
                    pass
        print(f"  [OK] Anexos baixados limpos: {cleared} itens removidos")

    # 4. Remover logs
    if AUDIT_LOG.exists():
        try:
            AUDIT_LOG.unlink()
            print(f"  [OK] Log de auditoria removido: {AUDIT_LOG.name}")
        except Exception:
            pass

    for log in ROOT_DIR.glob("*.log"):
        try:
            log.unlink()
        except Exception:
            pass

    # 5. Criar schema com Alembic
    print("\nRecriando schema do banco de dados via Alembic...")
    cmd_alembic = [sys.executable, "-m", "alembic", "upgrade", "head"]
    result = subprocess.run(cmd_alembic, cwd=str(SERVER_DIR), capture_output=True, text=True)
    if result.returncode != 0:
        print("  [ERRO] Falha ao executar migrations do Alembic:")
        print(result.stderr)
        return False
    print("  [OK] Migrations aplicadas com sucesso!")

    # 6. Criar Roles (ADMIN)
    print("\nCriando perfis de usuario...")
    cmd_roles = [sys.executable, "scripts/seed_roles.py"]
    result = subprocess.run(cmd_roles, cwd=str(SERVER_DIR), capture_output=True, text=True)
    if result.returncode != 0:
        print("  [ERRO] Falha ao criar perfis:")
        print(result.stderr)
        return False
    print("  [OK] Perfil ADMIN garantido!")

    # 7. Criar usuario Admin inicial
    admin_email = os.getenv("ADMIN_EMAIL", "admin@lge.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    admin_name = os.getenv("ADMIN_NAME", "Admin")

    print(f"\nCriando usuario ADMIN inicial ({admin_email})...")
    cmd_admin = [sys.executable, "scripts/create_admin.py", admin_email, admin_password, admin_name]
    result = subprocess.run(cmd_admin, cwd=str(SERVER_DIR), capture_output=True, text=True)
    if result.returncode != 0:
        print("  [ERRO] Falha ao criar usuario admin:")
        print(result.stderr)
        return False
    print(f"  [OK] Usuario admin criado com sucesso ({admin_email} / {admin_password})!")

    print("\n" + "=" * 60)
    print("RESET CONCLUIDO! Aplicacao pronta para teste do zero.")
    print(f"   Email: {admin_email}")
    print(f"   Senha: {admin_password}")
    print("   Todos os indicadores de KPI estao vazios (0 registros).")
    print("=" * 60 + "\n")
    return True


if __name__ == "__main__":
    success = reset()
    sys.exit(0 if success else 1)
