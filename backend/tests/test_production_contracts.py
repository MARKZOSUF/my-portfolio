from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def test_migrations_never_use_metadata_create_all():
 text='\n'.join(p.read_text() for p in (ROOT/'database/migrations/versions').glob('*.py'));assert 'Base.metadata.create_all' not in text;assert 'Base.metadata.drop_all' not in text
def test_incremental_revisions_exist():
 names=sorted(p.name for p in (ROOT/'database/migrations/versions').glob('*.py'))
 # forward-safe: the chain grows, but it must stay gapless and reach the current head
 assert len(names)>=12
 for index,name in enumerate(names,start=1):assert name.startswith(f'{index:04d}_'),f'gap at {name}'
 assert any(x.startswith('0011_study_artifacts') for x in names)
 assert any(x.startswith('0012_free_product') for x in names)
def test_feature_screen_contract_is_typed():
 text=(ROOT/'mobile/features/feature/FeatureScreen.tsx').read_text();assert 'inputLabel?:string' in text;assert 'useState<any>' not in text
def test_rate_limit_is_distributed():
 text=(ROOT/'backend/app/services/rate_limit.py').read_text();assert "redis.call('INCR'" in text;assert 'defaultdict' not in text and 'deque' not in text
def test_email_confirmation_is_token_authenticated():
 text=(ROOT/'backend/app/api/v1/auth/routes.py').read_text();fragment=text.split("@router.post('/email-verification/confirm'")[1];assert 'user:CurrentUser' not in fragment.split("@router",1)[0]
def test_ai_usage_is_operational():
 text=(ROOT/'backend/app/ai/usage/service.py').read_text();assert 'pg_advisory_xact_lock' in text;assert "row.status='completed'" in text;assert "row.status='failed'" in text
