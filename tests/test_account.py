"""Account action integration tests (spec section 4)."""


def test_change_password_flow(client, user):
    bad = client.post(
        "/api/auth/password", json={"current_password": "WrongPass123", "new_password": "NewStrong456"}
    )
    assert bad.status_code == 401
    ok = client.post(
        "/api/auth/password", json={"current_password": "StrongPass123", "new_password": "NewStrong456"}
    )
    assert ok.status_code == 200
    client.post("/api/auth/logout")
    assert (
        client.post("/api/auth/login", json={"email": "student@example.com", "password": "StrongPass123"}).status_code
        == 401
    )
    assert (
        client.post("/api/auth/login", json={"email": "student@example.com", "password": "NewStrong456"}).status_code
        == 200
    )


def test_logout_all_invalidates_other_sessions(app, user):
    second = app.test_client()
    assert (
        second.post("/api/auth/login", json={"email": "student@example.com", "password": "StrongPass123"}).status_code
        == 200
    )
    assert second.get("/api/usage").status_code == 200
    first = app.test_client()
    first.post("/api/auth/login", json={"email": "student@example.com", "password": "StrongPass123"})
    assert first.post("/api/auth/logout-all").status_code == 200
    # The second client's session version no longer matches.
    assert second.get("/api/usage").status_code == 401
    # The caller is signed out too.
    assert first.get("/api/usage").status_code == 401


def test_me_never_exposes_password_or_session_internals(client, user):
    body = client.get("/api/auth/me").get_data(as_text=True)
    assert "password_hash" not in body and "session_version" not in body


def test_account_endpoints_require_auth(client):
    assert (
        client.post("/api/auth/password", json={"current_password": "x", "new_password": "y"}).status_code == 401
    )
    assert client.post("/api/auth/logout-all").status_code == 401


def test_account_ui_markup_present():
    """Static frontend checks for the account menu (no inline scripts)."""
    base = open("templates/base.html").read()
    for marker in (
        'id="accountMenu"',
        'id="logoutButton"',
        'id="openChangePassword"',
        'id="logoutAllButton"',
        'id="passwordDialog"',
        'id="logoutAllDialog"',
        'autocomplete="current-password"',
        'autocomplete="new-password"',
        'aria-expanded',
    ):
        assert marker in base
    assert "<script>" not in base  # no inline scripts (CSP strict)
    app_js = open("static/js/app.js").read()
    for marker in ("/api/auth/logout", "/api/auth/password", "/api/auth/logout-all"):
        assert marker in app_js
