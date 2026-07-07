"""add to_account_id to transactions

Revision ID: b2a1c0d9f4e2
Revises: c9f05bde1c1a
Create Date: 2026-07-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2a1c0d9f4e2'
down_revision: Union[str, Sequence[str], None] = 'a663b2a72167'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('to_account_id', sa.UUID(), nullable=True))
    op.create_foreign_key(
        'fk_transactions_to_account_id_accounts',
        'transactions', 'accounts',
        ['to_account_id'], ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_transactions_to_account_id_accounts', 'transactions', type_='foreignkey')
    op.drop_column('transactions', 'to_account_id')
