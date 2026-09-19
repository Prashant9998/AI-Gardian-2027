"""001_initial_schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-09-18 22:45:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # 1. tenants
    if 'tenants' not in existing_tables:
        op.create_table(
            'tenants',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('name', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_tenants_id'), 'tenants', ['id'], unique=False)
        op.create_index(op.f('ix_tenants_name'), 'tenants', ['name'], unique=False)

    # 2. sites
    if 'sites' not in existing_tables:
        op.create_table(
            'sites',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('tenant_id', sa.Integer(), nullable=True),
            sa.Column('domain', sa.String(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['tenant_id'], ['tenants.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_sites_id'), 'sites', ['id'], unique=False)
        op.create_index(op.f('ix_sites_domain'), 'sites', ['domain'], unique=False)

    # 3. api_keys
    if 'api_keys' not in existing_tables:
        op.create_table(
            'api_keys',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('site_id', sa.Integer(), nullable=True),
            sa.Column('key_hash', sa.String(), nullable=False),
            sa.Column('is_active', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_api_keys_id'), 'api_keys', ['id'], unique=False)
        op.create_index(op.f('ix_api_keys_key_hash'), 'api_keys', ['key_hash'], unique=True)

    # 4. security_events
    if 'security_events' not in existing_tables:
        op.create_table(
            'security_events',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('site_id', sa.Integer(), nullable=True),
            sa.Column('timestamp', sa.DateTime(), nullable=True),
            sa.Column('source_ip', sa.String(), nullable=True),
            sa.Column('endpoint', sa.String(), nullable=True),
            sa.Column('method', sa.String(), nullable=True),
            sa.Column('rule_score', sa.Float(), nullable=True),
            sa.Column('ml_score', sa.Float(), nullable=True),
            sa.Column('final_score', sa.Float(), nullable=True),
            sa.Column('severity', sa.String(), nullable=True),
            sa.Column('action_taken', sa.String(), nullable=True),
            sa.Column('triggered_rules', sa.JSON(), nullable=True),
            sa.Column('payload_snapshot', sa.String(), nullable=True),
            sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_security_events_id'), 'security_events', ['id'], unique=False)
        op.create_index(op.f('ix_security_events_site_id'), 'security_events', ['site_id'], unique=False)
        op.create_index(op.f('ix_security_events_source_ip'), 'security_events', ['source_ip'], unique=False)
        op.create_index(op.f('ix_security_events_timestamp'), 'security_events', ['timestamp'], unique=False)
        op.create_index(op.f('ix_security_events_severity'), 'security_events', ['severity'], unique=False)

    # 5. attacker_profiles
    if 'attacker_profiles' not in existing_tables:
        op.create_table(
            'attacker_profiles',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('site_id', sa.Integer(), nullable=True),
            sa.Column('source_ip', sa.String(), nullable=False),
            sa.Column('country', sa.String(), nullable=True),
            sa.Column('risk_score', sa.Float(), nullable=True),
            sa.Column('first_seen', sa.DateTime(), nullable=True),
            sa.Column('last_seen', sa.DateTime(), nullable=True),
            sa.Column('attack_count', sa.Integer(), nullable=True),
            sa.Column('top_techniques', sa.JSON(), nullable=True),
            sa.Column('honeypot_interactions', sa.Integer(), nullable=True),
            sa.Column('is_banned', sa.Boolean(), nullable=True),
            sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_attacker_profiles_id'), 'attacker_profiles', ['id'], unique=False)
        op.create_index(op.f('ix_attacker_profiles_source_ip'), 'attacker_profiles', ['source_ip'], unique=True)
        op.create_index(op.f('ix_attacker_profiles_is_banned'), 'attacker_profiles', ['is_banned'], unique=False)

    # 6. blocked_ips
    if 'blocked_ips' not in existing_tables:
        op.create_table(
            'blocked_ips',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('site_id', sa.Integer(), nullable=True),
            sa.Column('source_ip', sa.String(), nullable=False),
            sa.Column('reason', sa.String(), nullable=False),
            sa.Column('blocked_at', sa.DateTime(), nullable=True),
            sa.Column('expires_at', sa.DateTime(), nullable=True),
            sa.Column('block_count', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_blocked_ips_id'), 'blocked_ips', ['id'], unique=False)
        op.create_index(op.f('ix_blocked_ips_source_ip'), 'blocked_ips', ['source_ip'], unique=False)

    # 7. honeypot_sessions
    if 'honeypot_sessions' not in existing_tables:
        op.create_table(
            'honeypot_sessions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('site_id', sa.Integer(), nullable=True),
            sa.Column('session_id', sa.String(), nullable=False),
            sa.Column('source_ip', sa.String(), nullable=False),
            sa.Column('start_time', sa.DateTime(), nullable=True),
            sa.Column('duration_seconds', sa.Float(), nullable=True),
            sa.Column('commands_executed', sa.JSON(), nullable=True),
            sa.Column('tokens_tripped', sa.JSON(), nullable=True),
            sa.Column('personality', sa.String(), nullable=True),
            sa.ForeignKeyConstraint(['site_id'], ['sites.id'], ),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_honeypot_sessions_id'), 'honeypot_sessions', ['id'], unique=False)
        op.create_index(op.f('ix_honeypot_sessions_session_id'), 'honeypot_sessions', ['session_id'], unique=True)


def downgrade() -> None:
    op.drop_table('honeypot_sessions')
    op.drop_table('blocked_ips')
    op.drop_table('attacker_profiles')
    op.drop_table('security_events')
    op.drop_table('api_keys')
    op.drop_table('sites')
    op.drop_table('tenants')
