from flask import Blueprint,jsonify,render_template
from sqlalchemy import func
from models import User,ResearchSession,UsageRecord
from extensions import db
from utils.auth import admin_required
from services.ai.factory import provider_status
bp=Blueprint("admin",__name__,url_prefix="/admin")
@bp.get("")
@admin_required
def dashboard(): return render_template("admin.html")
@bp.get("/api/stats")
@admin_required
def stats():
    statuses=dict(db.session.query(ResearchSession.status,func.count(ResearchSession.id)).group_by(ResearchSession.status).all())
    return jsonify({"success":True,"stats":{"users":User.query.count(),"research_requests":ResearchSession.query.count(),"usage_records":UsageRecord.query.count(),"research_by_status":statuses,"provider":provider_status()}})
