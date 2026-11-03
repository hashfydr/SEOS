"""001_initial_schema

Revision ID: e5fd55244948
Revises: 
Create Date: 2026-11-02 19:14:22.646730

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.database import Base
from app.models import *

# revision identifiers, used by Alembic.
revision: str = 'e5fd55244948'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    """Upgrade schema: Create all foundational SEOS relational tables."""
    bind = op.get_bind()
    Base.metadata.create_all(bind=bind)

def downgrade() -> None:
    """Downgrade schema: Drop all SEOS relational tables."""
    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)
