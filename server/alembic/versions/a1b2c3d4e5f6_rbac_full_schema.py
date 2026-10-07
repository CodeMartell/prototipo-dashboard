"""rbac_full_schema

Revision ID: a1b2c3d4e5f6
Revises: 0e4b193a8f14
Create Date: 2026-09-18 09:30:00.000000

Adiciona:
- coluna description em roles
- tabela permissions
- tabela role_permissions
- tabela audit_log (append-only)
- tabela action_plans
- colunas source + submitted_by em kpi_records e logistics_vs_prod_records
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '0e4b193a8f14'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # --- Adicionar description em roles ---
    if "roles" in existing_tables:
        role_cols = {c["name"] for c in inspector.get_columns("roles")}
        if "description" not in role_cols:
            op.add_column("roles", sa.Column("description", sa.String(200), nullable=True))

    # --- Tabela permissions ---
    if "permissions" not in existing_tables:
        op.create_table(
            "permissions",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("code", sa.String(80), nullable=False),
            sa.Column("description", sa.String(200), nullable=True),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("code"),
        )
        op.create_index(op.f("ix_permissions_code"), "permissions", ["code"], unique=True)

    # --- Tabela role_permissions ---
    if "role_permissions" not in existing_tables:
        op.create_table(
            "role_permissions",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("role_id", sa.String(), nullable=False),
            sa.Column("permission_id", sa.String(), nullable=False),
            sa.ForeignKeyConstraint(["role_id"], ["roles.id"]),
            sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
        )
        op.create_index(op.f("ix_role_permissions_role_id"), "role_permissions", ["role_id"])
        op.create_index(op.f("ix_role_permissions_permission_id"), "role_permissions", ["permission_id"])

    # --- Tabela audit_log (append-only) ---
    if "audit_log" not in existing_tables:
        op.create_table(
            "audit_log",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("actor_user_id", sa.String(), nullable=True),
            sa.Column("actor_role_snapshot", sa.String(50), nullable=True),
            sa.Column("action", sa.String(80), nullable=False),
            sa.Column("target_type", sa.String(50), nullable=True),
            sa.Column("target_id", sa.String(200), nullable=True),
            sa.Column("metadata", sa.JSON(), nullable=True),
            sa.Column("occurred_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("ip_address", sa.String(45), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_audit_log_actor_user_id"), "audit_log", ["actor_user_id"])
        op.create_index(op.f("ix_audit_log_action"), "audit_log", ["action"])
        op.create_index(op.f("ix_audit_log_occurred_at"), "audit_log", ["occurred_at"])

    # --- Tabela action_plans ---
    if "action_plans" not in existing_tables:
        op.create_table(
            "action_plans",
            sa.Column("id", sa.String(), nullable=False),
            sa.Column("title", sa.String(200), nullable=False),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("status", sa.String(30), nullable=False, server_default="open"),
            sa.Column("kpi_type", sa.String(80), nullable=True),
            sa.Column("submitted_by", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(["submitted_by"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_action_plans_submitted_by"), "action_plans", ["submitted_by"])
        op.create_index(op.f("ix_action_plans_kpi_type"), "action_plans", ["kpi_type"])
        op.create_index(op.f("ix_action_plans_created_at"), "action_plans", ["created_at"])

    # --- Colunas source + submitted_by em kpi_records ---
    if "kpi_records" in existing_tables:
        kpi_cols = {c["name"] for c in inspector.get_columns("kpi_records")}
        if "source" not in kpi_cols:
            op.add_column("kpi_records", sa.Column("source", sa.String(20), nullable=False, server_default="rpa_email"))
        if "submitted_by" not in kpi_cols:
            op.add_column("kpi_records", sa.Column("submitted_by", sa.String(), nullable=True))
            try:
                op.create_foreign_key(
                    "fk_kpi_records_submitted_by", "kpi_records", "users", ["submitted_by"], ["id"],
                    ondelete="SET NULL",
                )
                op.create_index(op.f("ix_kpi_records_submitted_by"), "kpi_records", ["submitted_by"])
            except Exception:
                pass

    # --- Colunas source + submitted_by em logistics_vs_prod_records ---
    if "logistics_vs_prod_records" in existing_tables:
        lvp_cols = {c["name"] for c in inspector.get_columns("logistics_vs_prod_records")}
        if "source" not in lvp_cols:
            op.add_column("logistics_vs_prod_records", sa.Column("source", sa.String(20), nullable=False, server_default="rpa_email"))
        if "submitted_by" not in lvp_cols:
            op.add_column("logistics_vs_prod_records", sa.Column("submitted_by", sa.String(), nullable=True))
            try:
                op.create_foreign_key(
                    "fk_logistics_vs_prod_submitted_by", "logistics_vs_prod_records", "users",
                    ["submitted_by"], ["id"], ondelete="SET NULL",
                )
                op.create_index(op.f("ix_logistics_vs_prod_records_submitted_by"), "logistics_vs_prod_records", ["submitted_by"])
            except Exception:
                pass



def downgrade() -> None:
    # Reverter na ordem inversa
    op.drop_index(op.f('ix_logistics_vs_prod_records_submitted_by'), table_name='logistics_vs_prod_records')
    op.drop_constraint('fk_logistics_vs_prod_submitted_by', 'logistics_vs_prod_records', type_='foreignkey')
    op.drop_column('logistics_vs_prod_records', 'submitted_by')
    op.drop_column('logistics_vs_prod_records', 'source')

    op.drop_index(op.f('ix_kpi_records_submitted_by'), table_name='kpi_records')
    op.drop_constraint('fk_kpi_records_submitted_by', 'kpi_records', type_='foreignkey')
    op.drop_column('kpi_records', 'submitted_by')
    op.drop_column('kpi_records', 'source')

    op.drop_index(op.f('ix_action_plans_created_at'), table_name='action_plans')
    op.drop_index(op.f('ix_action_plans_kpi_type'), table_name='action_plans')
    op.drop_index(op.f('ix_action_plans_submitted_by'), table_name='action_plans')
    op.drop_table('action_plans')

    op.drop_index(op.f('ix_audit_log_occurred_at'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_action'), table_name='audit_log')
    op.drop_index(op.f('ix_audit_log_actor_user_id'), table_name='audit_log')
    op.drop_table('audit_log')

    op.drop_index(op.f('ix_role_permissions_permission_id'), table_name='role_permissions')
    op.drop_index(op.f('ix_role_permissions_role_id'), table_name='role_permissions')
    op.drop_table('role_permissions')

    op.drop_index(op.f('ix_permissions_code'), table_name='permissions')
    op.drop_table('permissions')

    op.drop_column('roles', 'description')
