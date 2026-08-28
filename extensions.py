from flask import session
from flask_sqlalchemy import SQLAlchemy
from flask_wtf import CSRFProtect
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate

def rate_limit_key():
    user_id=session.get("user_id")
    return f"user:{user_id}" if user_id else f"ip:{get_remote_address()}"

db=SQLAlchemy()
csrf=CSRFProtect()
limiter=Limiter(key_func=rate_limit_key, default_limits=["300 per hour"])
migrate=Migrate(compare_type=True)
