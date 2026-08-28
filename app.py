"""Application factory for StudyResearch AI."""
import logging
import os
import secrets
from pathlib import Path

from flask import Flask, jsonify, render_template, request
from flask_wtf.csrf import CSRFError

from config import config_by_name, validate_config_or_raise
from extensions import csrf, db, limiter, migrate
from utils.errors import payload, register_error_handlers


class SecretFilter(logging.Filter):
    """Redact the configured AI key from every log record."""

    def __init__(self, secret):
        super().__init__()
        self.secret = secret or ""

    def filter(self, record):
        if self.secret:
            record.msg = str(record.msg).replace(self.secret, "[REDACTED]")
            if record.args:
                record.args = tuple(str(x).replace(self.secret, "[REDACTED]") for x in record.args)
        return True


def create_app(config_name=None, overrides=None):
    app = Flask(__name__, instance_relative_config=True)
    name = config_name or os.getenv("FLASK_ENV", "development")
    if name not in config_by_name:
        raise RuntimeError("FLASK_ENV must be development, testing, or production")
    app.config.from_object(config_by_name[name])
    if overrides:
        app.config.update(overrides)
    validate_config_or_raise(app.config)
    Path(app.instance_path).mkdir(parents=True, exist_ok=True)
    Path(app.config["UPLOAD_FOLDER"]).mkdir(parents=True, exist_ok=True, mode=0o700)
    app.logger.addFilter(SecretFilter(app.config.get("AI_API_KEY")))
    db.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)
    migrate.init_app(app, db)
    register_error_handlers(app)

    from routes.admin import bp as admin_bp
    from routes.auth import bp as auth_bp
    from routes.chat import bp as chat_bp
    from routes.documents import bp as documents_bp
    from routes.flashcards import bp as flashcards_bp
    from routes.notes import bp as notes_bp
    from routes.quiz import bp as quiz_bp
    from routes.research import bp as research_bp
    from routes.system import bp as system_bp

    for blueprint in (
        auth_bp,
        research_bp,
        chat_bp,
        notes_bp,
        quiz_bp,
        flashcards_bp,
        documents_bp,
        admin_bp,
        system_bp,
    ):
        app.register_blueprint(blueprint)

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/research/<public_id>")
    def research_workspace(public_id):
        return render_template("research.html", public_id=public_id)

    @app.errorhandler(CSRFError)
    def csrf_error(_):
        return jsonify(payload("CSRF_FAILED", "Your security token is missing or expired. Refresh and try again.")), 400

    @app.after_request
    def secure_headers(response):
        headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
            "Content-Security-Policy": app.config["CONTENT_SECURITY_POLICY"],
        }
        for key, value in headers.items():
            response.headers.setdefault(key, value)
        if response.mimetype == "text/event-stream":
            response.headers["Cache-Control"] = "no-cache, no-transform"
        elif request.path.startswith(("/api/", "/admin/api/")):
            response.headers.setdefault("Cache-Control", "no-store")
        return response

    with app.app_context():
        if app.config.get("AUTO_CREATE_DB"):
            db.create_all()
    register_cli(app)
    return app


def register_cli(app):
    @app.cli.command("create-admin")
    def create_admin():
        from getpass import getpass

        from models import User
        from utils.validation import validate_email, validate_password

        email = validate_email(input("Admin email: "))
        user = User.query.filter_by(email=email).first()
        if not user:
            password = validate_password(getpass("Password: "))
            user = User(email=email, display_name="Administrator", is_admin=True)
            user.set_password(password)
            db.session.add(user)
        else:
            user.is_admin = True
        db.session.commit()
        print("Administrator configured.")

    @app.cli.command("cleanup-orphans")
    def cleanup_orphans():
        from services.documents.storage import cleanup_orphans

        print(f"Removed {cleanup_orphans()} orphan file(s).")

    @app.cli.command("recover-stuck")
    def recover_stuck():
        """Fail research sessions stuck in queued/running past the limit."""
        from services.jobs import recover_stuck_sessions

        print(f"Recovered {recover_stuck_sessions()} stuck session(s).")


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=False)
