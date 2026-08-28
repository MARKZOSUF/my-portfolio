from flask import Blueprint,request,jsonify,send_file
from extensions import db,limiter
from models import ResearchSession,Note
from utils.auth import login_required,current_user
from utils.validation import require_json,clean_text
from utils.errors import AppError
from services.ai.factory import get_ai_provider,require_ai_ready
from services.research.prompts import EVIDENCE_RULES
from services.export.pdf_export import make_pdf
bp=Blueprint("notes",__name__,url_prefix="/api/notes")
def get_note(pid):
    note=Note.query.filter_by(public_id=pid).first(); row=ResearchSession.query.filter_by(id=note.session_id,user_id=current_user().id).first() if note else None
    if not note or not row: raise AppError("NOTE_NOT_FOUND","Note not found.",404)
    return note,row
def pack(n): return {"id":n.public_id,"title":n.title,"content":n.content,"language":n.language,"version":n.version,"updated_at":n.updated_at.isoformat()}
@bp.get("/<pid>")
@login_required
def get(pid): return jsonify({"success":True,"note":pack(get_note(pid)[0])})
@bp.put("/<pid>")
@login_required
def save(pid):
    note,_=get_note(pid); data=require_json(request); note.content=clean_text(data.get("content"),500000,"note",preserve_lines=True); db.session.commit(); return jsonify({"success":True,"note":pack(note)})
@bp.post("/generate")
@login_required
@limiter.limit("10 per hour")
def generate():
    data=require_json(request); row=ResearchSession.query.filter_by(public_id=data.get("research_id"),user_id=current_user().id).first()
    if not row or row.status!="complete": raise AppError("RESEARCH_NOT_READY","Research is not ready.",409)
    current=Note.query.filter_by(session_id=row.id,is_current=True).order_by(Note.version.desc()).first()
    if current and not data.get("regenerate"): return jsonify({"success":True,"reused":True,"note":pack(current)})
    version=(current.version+1) if current else 1
    if current: current.is_current=False
    note=Note(session_id=row.id,title=f"Study notes — {row.query[:120]}",content=row.result_json.get("complete_notes_markdown","") or "Needs verification",language=row.language,version=version); db.session.add(note); db.session.commit(); return jsonify({"success":True,"reused":False,"note":pack(note)}),201
@bp.post("/<pid>/rewrite")
@login_required
@limiter.limit("10 per hour")
def rewrite(pid):
    note,_=get_note(pid); data=require_json(request); style=data.get("style","simpler")
    if style not in {"simpler","shorter","detailed","technical"}: raise AppError("INVALID_STYLE","Unsupported rewrite style.")
    require_ai_ready()
    prompt=f"{EVIDENCE_RULES}\nRewrite the untrusted notes below in a {style} style. Preserve valid citation numbers. Do not add claims.\n<UNTRUSTED_NOTES>\n{note.content}\n</UNTRUSTED_NOTES>"
    note.content=get_ai_provider().generate([{"role":"system","content":EVIDENCE_RULES},{"role":"user","content":prompt}],max_tokens=4000).text; db.session.commit(); return jsonify({"success":True,"note":pack(note)})
@bp.post("/<pid>/translate")
@login_required
@limiter.limit("10 per hour")
def translate(pid):
    note,_=get_note(pid); data=require_json(request); language=data.get("language")
    if language not in {"English","Hindi","Hinglish"}: raise AppError("INVALID_LANGUAGE","Unsupported language.")
    require_ai_ready()
    prompt=f"{EVIDENCE_RULES}\nTranslate the untrusted notes to {language}. Preserve technical terms and valid citation numbers. Add no facts.\n<UNTRUSTED_NOTES>\n{note.content}\n</UNTRUSTED_NOTES>"
    note.content=get_ai_provider().generate([{"role":"system","content":EVIDENCE_RULES},{"role":"user","content":prompt}],max_tokens=4000).text; note.language=language; db.session.commit(); return jsonify({"success":True,"note":pack(note)})
@bp.post("/<pid>/export/pdf")
@login_required
@limiter.limit("10 per hour")
def export_pdf(pid):
    note,row=get_note(pid); pdf=make_pdf(row,row.sources,note=note); return send_file(pdf,mimetype="application/pdf",as_attachment=True,download_name="StudyResearch-AI-Study-Pack.pdf")
