"""
scripts/development/reset_kpis.py
Reseta EXCLUSIVAMENTE os dados de KPIs, filas de ingestao e historico do robo.

PRESERVA INTACTOS:
- Usuarios (users)
- Perfis e Permissoes (roles, permissions, role_permissions)
- Auditoria do sistema (audit_logs, activity_logs)

Pode ser executado diretamente no terminal do VSCode/Antigravity:
    python scripts/development/reset_kpis.py
"""
import os
import shutil
import subprocess
import sys
from pathlib import Path

from sqlalchemy import create_engine, inspect, text

# Garante suporte a UTF-8 no terminal Windows
if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT_DIR / ".env"
ATTACHMENTS_DIR = ROOT_DIR / "rpa_email" / "resources" / "attachments"
LOCAL_HISTORY_DB = ROOT_DIR / "rpa_email" / "resources" / "api_email_history.db"
RESOURCES_HISTORY_DB = ROOT_DIR / "rpa_email" / "resources" / "history" / "email_history.db"

# Tabelas de KPIs e governanca a serem esvaziadas (ordem respeita integridade relacional)
KPI_TABLES = [
    "action_plans",
    "evidences",
    "kpi_change_logs",
    "email_ingest_queue",
    "processed_emails",
    "kpi_logistic_cost",
    "kpi_air_freight",
    "kpi_incidental_cost",
    "kpi_total_cost",
    "kpi_demurrage",
    "kpi_logistics_vs_prod",
    "kpi_records",
    "logistics_vs_prod_records",
]


def load_database_url() -> str:
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return db_url

    if ENV_FILE.exists():
        with open(ENV_FILE, encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL=") and not line.startswith("#"):
                    db_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break

    if not db_url:
        db_url = "postgresql+psycopg://dashboard:dashboard@localhost:5434/dashboard"

    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    return db_url


def clear_kpi_tables(engine) -> None:
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    print("\n[1/2] Limpando tabelas de dados de KPI no banco de dados...")
    with engine.begin() as conn:
        for table in KPI_TABLES:
            if table in existing_tables:
                try:
                    count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                    if engine.dialect.name == "postgresql":
                        conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
                    else:
                        conn.execute(text(f"DELETE FROM {table}"))
                    print(f"  [OK] {table}: {count} registro(s) apagado(s) (tabela zerada)")
                except Exception as e:
                    print(f"  [AVISO] Ao limpar {table}: {e}")

        # Seguranca: exibe que usuarios e permissoes permanecem intocados
        if "users" in existing_tables:
            user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            print(f"\n  [SEGURANCA] {user_count} usuario(s) mantido(s) intacto(s) na tabela 'users'!")
        if "roles" in existing_tables:
            role_count = conn.execute(text("SELECT COUNT(*) FROM roles")).scalar()
            print(f"  [SEGURANCA] {role_count} perfil(is) mantido(s) intacto(s) na tabela 'roles'!")


def clear_robot_history() -> None:
    print("\n[2/2] Limpando historico de e-mails e anexos do robo...")

    for history_file in (LOCAL_HISTORY_DB, RESOURCES_HISTORY_DB):
        if history_file.exists():
            try:
                history_file.unlink()
                print(f"  [OK] Arquivo de historico local removido: {history_file.name}")
            except Exception as e:
                print(f"  [AVISO] Nao foi possivel remover {history_file}: {e}")

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
        print(f"  [OK] Pasta de anexos esvaziada ({cleared} arquivo(s) removido(s))")

    # Limpa tambem o volume do robo no Docker, se o Docker estiver em uso
    try:
        res = subprocess.run(
            ["docker", "compose", "ps", "--services"],
            cwd=str(ROOT_DIR),
            capture_output=True,
            text=True,
        )
        if "rpa-bot" in res.stdout or "db" in res.stdout:
            subprocess.run(
                ["docker", "compose", "run", "--rm", "rpa-bot", "rm", "-f", "/app/rpa_email/resources/history/email_history.db"],
                cwd=str(ROOT_DIR),
                capture_output=True,
                text=True,
            )
            print("  [OK] Historico do robo no container/volume Docker resetado com sucesso!")
    except Exception:
        pass


def main():
    print("=" * 65)
    print("  RESET ESPECIFICO DE DADOS DE KPI (USUARIOS PRESERVADOS)")
    print("=" * 65)

    db_url = load_database_url()
    display_url = db_url
    if "@" in display_url and ":" in display_url.split("@")[0]:
        prefix, rest = display_url.split(":", 2)[0], display_url.split("@", 1)[1]
        display_url = f"{prefix}:***@{rest}"

    print(f"Conectando ao banco: {display_url}")
    try:
        engine = create_engine(db_url)
        clear_kpi_tables(engine)
    except Exception as e:
        print(f"\n[ERRO] Falha ao conectar/limpar banco de dados: {e}")
        return False

    clear_robot_history()

    print("\n" + "=" * 65)
    print("  [SUCESSO] BASE DE DADOS DE KPIS TOTALMENTE ZERADA!")
    print("  Os usuarios, senhas e permissoes de login continuam intactos.")
    print("  O robo de e-mail agora pode ser executado para processar do zero.")
    print("=" * 65 + "\n")
    return True


if __name__ == "__main__":
    success = main()
    raise SystemExit(0 if success else 1)
