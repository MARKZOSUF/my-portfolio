from unittest.mock import patch
from app import create_app
def test_register_login_logout(client):
    r=client.post("/api/auth/register",json={"email":" Student@Example.com ","password":"StrongPass123","display_name":"Student"}); assert r.status_code==201; assert "password_hash" not in r.get_data(as_text=True)
    assert client.post("/api/auth/logout").status_code==200
    assert client.post("/api/auth/login",json={"email":"student@example.com","password":"StrongPass123"}).status_code==200
def test_duplicate_email_is_409(client):
    body={"email":"a@example.com","password":"StrongPass123","display_name":"A"}; assert client.post("/api/auth/register",json=body).status_code==201; assert client.post("/api/auth/register",json=body).status_code==409
def test_password_max(client): assert client.post("/api/auth/register",json={"email":"a@b.com","password":"A1"*100,"display_name":"A"}).status_code==400
def test_csrf_json(tmp_path):
    app=create_app("testing",{"WTF_CSRF_ENABLED":True,"UPLOAD_FOLDER":str(tmp_path/"u")}); r=app.test_client().post("/api/auth/register",json={}); assert r.status_code==400; assert r.json["error"]["code"]=="CSRF_FAILED"
def test_production_rejects_insecure(tmp_path):
    import pytest
    with pytest.raises(RuntimeError): create_app("production",{"SECRET_KEY":"short","AI_API_KEY":"","SQLALCHEMY_DATABASE_URI":"sqlite:///x.db","SESSION_COOKIE_SECURE":False,"JOB_BACKEND":"thread","RATELIMIT_STORAGE_URI":"memory://","MALWARE_SCANNER":"noop","UPLOAD_FOLDER":str(tmp_path/"u")})
