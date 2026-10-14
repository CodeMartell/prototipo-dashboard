"""
server/scripts/reset_kpis.py
Reseta EXCLUSIVAMENTE os dados de KPIs, filas de ingestão e evidências.
NÃO altera nem apaga usuários (users), perfis (roles) ou permissões.

Uso dentro do container Docker da API:
    docker compose exec api python scripts/reset_kpis.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import inspect, text
from app.database.session import engine

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


def reset():
    print("=" * 65)
    print("  RESET DE DADOS DE KPI (CONTAINER API) - USUARIOS PRESERVADOS")
    print("=" * 65)

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        for table in KPI_TABLES:
            if table in existing_tables:
                try:
                    count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                    if engine.dialect.name == "postgresql":
                        conn.execute(text(f"TRUNCATE TABLE {table} RESTART IDENTITY CASCADE"))
                    else:
                        conn.execute(text(f"DELETE FROM {table}"))
                    print(f"  ✓ {table}: {count} registro(s) apagado(s) (zerada)")
                except Exception as e:
                    print(f"  ⚠ Aviso em {table}: {e}")

        if "users" in existing_tables:
            user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar()
            print(f"\n  🛡️  SEGURANCA: {user_count} usuario(s) mantido(s) intacto(s) na tabela 'users'!")
        if "roles" in existing_tables:
            role_count = conn.execute(text("SELECT COUNT(*) FROM roles")).scalar()
            print(f"  🛡️  SEGURANCA: {role_count} perfil(is) mantido(s) intacto(s) na tabela 'roles'!")

    print("\n" + "=" * 65)
    print("  [SUCESSO] TABELAS DE KPIS ZERADAS COM SUCESSO!")
    print("  Usuarios, senhas e perfis continuam intactos.")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    reset()
