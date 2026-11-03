"""002_add_audit_and_indexes

Revision ID: a7b8c9d0e1f2
Revises: e5fd55244948
Create Date: 2026-11-02 21:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a7b8c9d0e1f2'
down_revision: Union[str, Sequence[str], None] = 'e5fd55244948'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema: Add performance indexes on trace_links and requirements."""
    with op.batch_alter_table("trace_links") as batch_op:
        batch_op.create_index("ix_trace_links_target_lookup", ["target_type", "target_id"])
    with op.batch_alter_table("requirements") as batch_op:
        batch_op.create_index("ix_requirements_priority_status", ["priority", "status"])

def downgrade() -> None:
    """Downgrade schema: Drop performance indexes."""
    with op.batch_alter_table("requirements") as batch_op:
        batch_op.drop_index("ix_requirements_priority_status")
    with op.batch_alter_table("trace_links") as batch_op:
        batch_op.drop_index("ix_trace_links_target_lookup")
