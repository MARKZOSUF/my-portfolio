from functools import wraps
from flask import session
from models import User
from utils.errors import AppError
def current_user():
    uid=session.get("user_id")
    user=User.query.session.get(User,uid) if uid else None
    if user and session.get("session_version") != user.session_version:
        session.clear(); return None
    return user
def login_user(user):
    session.clear(); session["user_id"]=user.id; session["session_version"]=user.session_version; session.permanent=True
def login_required(fn):
    @wraps(fn)
    def wrapped(*a,**kw):
        if not current_user(): raise AppError("AUTH_REQUIRED","Please sign in to continue.",401)
        return fn(*a,**kw)
    return wrapped
def admin_required(fn):
    @wraps(fn)
    def wrapped(*a,**kw):
        user=current_user()
        if not user or not user.is_admin: raise AppError("ADMIN_REQUIRED","Administrator access required.",403)
        return fn(*a,**kw)
    return wrapped
