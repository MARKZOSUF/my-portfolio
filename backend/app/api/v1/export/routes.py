import io,uuid
from fastapi import APIRouter,HTTPException,Query
from fastapi.responses import StreamingResponse
from docx import Document as Docx
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from app.api.deps import CurrentUser,DB
from app.database.models import Note
router=APIRouter(prefix='/export',tags=['export'])
@router.get('/notes/{note_id}')
async def export_note(note_id:uuid.UUID,user:CurrentUser,db:DB,format:str=Query('pdf',pattern='^(pdf|docx|md|txt)$')):
 note=await db.get(Note,note_id)
 if not note or note.owner_id!=user.id:raise HTTPException(404,'Note not found')
 if format in {'md','txt'}:
  data=(f'# {note.title}\n\n{note.content}' if format=='md' else f'{note.title}\n\n{note.content}').encode();return StreamingResponse(io.BytesIO(data),media_type='text/markdown' if format=='md' else 'text/plain',headers={'Content-Disposition':f'attachment; filename="note.{format}"'})
 if format=='docx':
  out=io.BytesIO();doc=Docx();doc.add_heading(note.title,0)
  for line in note.content.splitlines():doc.add_paragraph(line)
  doc.save(out);out.seek(0);return StreamingResponse(out,media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document',headers={'Content-Disposition':'attachment; filename="note.docx"'})
 out=io.BytesIO();pdf=canvas.Canvas(out,pagesize=A4);width,height=A4;y=height-50;pdf.setTitle(note.title);pdf.setFont('Helvetica-Bold',16);pdf.drawString(45,y,note.title[:80]);y-=28;pdf.setFont('Helvetica',10)
 for raw in note.content.splitlines():
  words=raw.split();line=''
  for word in words:
   if pdf.stringWidth(line+' '+word,'Helvetica',10)>width-90:pdf.drawString(45,y,line);y-=14;line=word
   else:line=(line+' '+word).strip()
   if y<50:pdf.showPage();pdf.setFont('Helvetica',10);y=height-50
  pdf.drawString(45,y,line);y-=14
 pdf.save();out.seek(0);return StreamingResponse(out,media_type='application/pdf',headers={'Content-Disposition':'attachment; filename="note.pdf"'})
