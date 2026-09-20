"""add_evidences

Revision ID: fcde92380035
Revises: 0e4b193a8f14
Create Date: 2026-09-19 15:40:52.566754

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fcde92380035'
down_revision = "0e4b193a8f14"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "evidences",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.String(), nullable=False),
        sa.Column("kpi_key", sa.String(length=100), nullable=False),
        sa.Column("year", sa.String(length=10), nullable=False),
        sa.Column("period", sa.String(length=20), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("content_type", sa.String(length=255), nullable=True),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("blob", sa.LargeBinary(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_evidences_user_id", "evidences", ["user_id"])
    op.create_index("ix_evidences_kpi_key", "evidences", ["kpi_key"])


def downgrade() -> None:
    op.drop_index("ix_evidences_kpi_key", table_name="evidences")
    op.drop_index("ix_evidences_user_id", table_name="evidences")
    op.drop_table("evidences")