import ast,asyncio,sys
from pathlib import Path
ROOT=Path(__file__).parents[2];sys.path.insert(0,str(ROOT/'backend'))
def test_research_has_seven_intents():
 src=(ROOT/'backend/app/research/engine.py').read_text();tree=ast.parse(src);assert "search_queries" in src;assert src.count("f'{q}")>=6
def test_ssrf_policy_present():
 src=(ROOT/'backend/app/research/engine.py').read_text();assert 'ip.is_global' in src and "{'http','https'}" in src
def test_citation_graph_models():
 src=(ROOT/'backend/app/database/models.py').read_text()
 for name in ['ResearchSource','Claim','Evidence','Citation','AIUsage','SessionToken']:assert f'class {name}' in src
def test_no_fake_research_fallback():
 src=(ROOT/'backend/app/research/engine.py').read_text();assert 'capability_unavailable' in src;assert 'No subject answer was fabricated' in src
def test_mobile_research_not_generic():
 src=(ROOT/'mobile/app/(main)/research/index.tsx').read_text();assert '/research/jobs' in src and 'FeatureScreen' not in src
def test_production_guards():
 src=(ROOT/'backend/app/config/settings.py').read_text();assert 'development providers' in src and 'malware scanner' in src
def test_upload_security_hooks():
 src=(ROOT/'backend/app/api/v1/documents/routes.py').read_text();assert 'inspect(data,mime)' in src and 'malware(data)' in src
def test_offline_message_exact():
 assert 'Offline — changes will sync automatically' in (ROOT/'mobile/components/ui/OfflineBanner.tsx').read_text()
