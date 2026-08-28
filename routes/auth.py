from flask import Blueprint,request,jsonify,session
from sqlalchemy.exc import IntegrityError
from extensions import db,limiter
from models import User
from utils.validation import require_json,validate_email,validate_password,clean_text
from utils.errors import AppError
from utils.auth import current_user,login_user,login_required
bp=Blueprint("auth",__name__,url_prefix="/api/auth")
def public(user): return {"id":user.public_id,"email":user.email,"display_name":user.display_name,"is_admin":user.is_admin}
@bp.post("/register")
@limiter.limit("5 per minute")
def register():
    data=require_json(request); email=validate_email(data.get("email")); password=validate_password(data.get("password")); name=clean_text(data.get("display_name"),80,"display name")
    user=User(email=email,display_name=name); user.set_password(password); db.session.add(user)
    try: db.session.commit()
    except IntegrityError: db.session.rollback(); raise AppError("EMAIL_EXISTS","An account already exists for this email.",409)
    login_user(user); return jsonify({"success":True,"user":public(user)}),201
@bp.post("/login")
@limiter.limit("10 per minute")
def login():
    data=require_json(request); email=validate_email(data.get("email")); password=str(data.get("password") or "")[:129]; user=User.query.filter_by(email=email).first()
    if not user or not user.check_password(password): raise AppError("INVALID_CREDENTIALS","Email or password is incorrect.",401)
    login_user(user); return jsonify({"success":True,"user":public(user)})
@bp.post("/logout")
def logout(): session.clear(); return jsonify({"success":True})
@bp.post("/password")
@login_required
@limiter.limit("5 per hour")
def change_password():
    user=current_user(); data=require_json(request)
    if not user.check_password(str(data.get("current_password") or "")[:129]): raise AppError("INVALID_CREDENTIALS","Current password is incorrect.",401)
    user.set_password(validate_password(data.get("new_password"))); user.session_version+=1; db.session.commit(); login_user(user); return jsonify({"success":True})
@bp.post("/logout-all")
@login_required
def logout_all():
    user=current_user(); user.session_version+=1; db.session.commit(); session.clear(); return jsonify({"success":True})
@bp.get("/me")
def me():
    user=current_user(); return jsonify({"authenticated":bool(user),"user":public(user) if user else None})
