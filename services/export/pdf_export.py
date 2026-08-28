from datetime import datetime,timezone
from io import BytesIO
import re
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet,ParagraphStyle
from reportlab.platypus import SimpleDocTemplate,Paragraph,Spacer,PageBreak,KeepTogether,ListFlowable,ListItem,Table,TableStyle
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics

def _safe(text): return escape(str(text or "")).replace("\n","<br/>")
def _markdown(text,styles):
    flow=[]; bullets=[]
    def flush():
        nonlocal bullets
        if bullets: flow.append(ListFlowable([ListItem(Paragraph(_safe(x),styles["BodyText"])) for x in bullets],bulletType="bullet",leftIndent=18)); bullets=[]
    for line in str(text or "").splitlines():
        if line.startswith("### "): flush(); flow.append(Paragraph(_safe(line[4:]),styles["Heading3"]))
        elif line.startswith("## "): flush(); flow.append(Paragraph(_safe(line[3:]),styles["Heading2"]))
        elif line.startswith("# "): flush(); flow.append(Paragraph(_safe(line[2:]),styles["Heading1"]))
        elif re.match(r"^[-*]\s+",line): bullets.append(re.sub(r"^[-*]\s+","",line))
        elif line.strip(): flush(); flow.append(Paragraph(_safe(line),styles["BodyText"])); flow.append(Spacer(1,4))
    flush(); return flow

def make_pdf(session,sources,note=None):
    out=BytesIO(); doc=SimpleDocTemplate(out,pagesize=A4,rightMargin=42,leftMargin=42,topMargin=44,bottomMargin=44,title=f"Study Pack — {session.query}")
    styles=getSampleStyleSheet(); styles.add(ParagraphStyle(name="Brand",parent=styles["Title"],textColor=colors.HexColor("#3157D5"),fontSize=18,spaceAfter=8)); styles["BodyText"].fontSize=9.5; styles["BodyText"].leading=14
    story=[Paragraph("StudyResearch AI",styles["Brand"]),Paragraph(_safe(session.query),styles["Title"]),Paragraph(f"Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} · {escape(session.language)} · {escape(session.study_mode.replace('_',' '))}",styles["Italic"]),Spacer(1,14)]
    result=session.result_json or {}; sections=[("Quick Summary",result.get("quick_summary","")),("Complete Notes",note.content if note else result.get("complete_notes_markdown","")),("Revision Sheet",result.get("revision_sheet_markdown",""))]
    for title,body in sections:
        if body: story.append(Paragraph(title,styles["Heading2"])); story.extend(_markdown(body,styles)); story.append(Spacer(1,10))
    story.extend([PageBreak(),Paragraph("Sources",styles["Heading2"]),Paragraph("Quality scores are heuristic indicators, not scientifically proven reliability percentages.",styles["Italic"])])
    if sources:
        for s in sources: story.extend([Paragraph(_safe(f"[{s.citation_index}] {s.title}"),styles["Heading4"]),Paragraph(_safe(s.url),styles["BodyText"]),Paragraph(_safe(f"Extraction: {s.extraction_status}"),styles["Italic"]),Spacer(1,6)])
    else: story.append(Paragraph("Document Study Mode used no live web sources.",styles["BodyText"]))
    story.extend([Spacer(1,16),Paragraph("Disclaimer",styles["Heading2"]),Paragraph("AI output can be inaccurate or incomplete. Verify high-stakes information against authoritative primary sources.",styles["BodyText"])])
    doc.build(story); out.seek(0); return out
