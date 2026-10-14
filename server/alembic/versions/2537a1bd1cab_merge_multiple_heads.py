"""merge multiple heads

Revision ID: 2537a1bd1cab
Revises: a1b2c3d4e5f6, fcde92380035
Create Date: 2026-09-19 21:19:03.370237

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2537a1bd1cab'
down_revision = ('a1b2c3d4e5f6', 'fcde92380035')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
