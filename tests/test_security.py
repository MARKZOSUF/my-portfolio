import pytest
from utils.errors import AppError
from utils.security import validate_public_url
from services.research.source_quality import score_source
@pytest.mark.parametrize("url",["javascript:alert(1)","data:text/html,x","file:///etc/passwd","ftp://example.com/a","http://localhost","http://127.0.0.1","http://169.254.169.254/latest","http://user:pass@example.com"])
def test_unsafe_urls(url):
    with pytest.raises(AppError): validate_public_url(url)
def test_domain_spoofing():
    assert score_source("https://nasa.gov.evil.example",extraction_status="x")[3]<.9
    assert score_source("https://evil-nasa.gov",extraction_status="x")[3]<.95
    assert score_source("https://who.int.evil.example",extraction_status="x")[3]<.9
def test_valid_authority_subdomains():
    assert score_source("https://www.nasa.gov/a")[3]>=.95
    assert score_source("https://research.nasa.gov/a")[3]>=.95
def test_headers(client):
    r=client.get("/"); assert "unsafe-inline" not in r.headers["Content-Security-Policy"]; assert r.headers["X-Frame-Options"]=="DENY"
def test_no_inline_admin_script(): assert "<script>" not in open("templates/admin.html").read()
def test_key_not_in_frontend():
    for path in ["templates/base.html","templates/index.html","templates/research.html","static/js/app.js","static/js/research.js"]: assert "your-single-provider-key" not in open(path).read()
