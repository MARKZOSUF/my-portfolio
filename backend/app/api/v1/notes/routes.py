import json,uuid
from fastapi import APIRouter,HTTPException,Query,Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.ai.orchestrator.service import StudyOrchestrator
from app.database.models import Note
from app.schemas.notes import GenerateNotesIn,NoteCreate,NoteOut,NotePatch,StudyPackage
from app.search.rag import retrieve
router=APIRouter(prefix='/notes',tags=['notes'])
def serialize(n:Note)->NoteOut:return NoteOut(id=str(n.id),title=n.title,content=n.content,subject=n.subject,topic=n.topic,created_at=n.created_at,updated_at=n.updated_at)
@router.get('')
async def list_notes(user:CurrentUser,db:DB,limit:int=Query(30,ge=1,le=100),cursor:str|None=None):
 stmt=select(Note).where(Note.owner_id==user.id,Note.is_archived.is_(False)).order_by(Note.updated_at.desc()).limit(limit)
 if cursor:stmt=stmt.where(Note.id<uuid.UUID(cursor))
 rows=(await db.scalars(stmt)).all();return {'items':[serialize(x) for x in rows],'next_cursor':str(rows[-1].id) if len(rows)==limit else None}
@router.post('',response_model=NoteOut,status_code=201)
async def create(payload:NoteCreate,user:CurrentUser,db:DB):
 n=Note(owner_id=user.id,**payload.model_dump());db.add(n);await db.commit();await db.refresh(n);return serialize(n)
@router.get('/{note_id}',response_model=NoteOut)
async def get(note_id:uuid.UUID,user:CurrentUser,db:DB):
 n=await db.get(Note,note_id)
 if not n or n.owner_id!=user.id or n.is_archived:raise HTTPException(404,'Note not found')
 return serialize(n)
@router.patch('/{note_id}',response_model=NoteOut)
async def patch(note_id:uuid.UUID,payload:NotePatch,user:CurrentUser,db:DB):
 n=await db.get(Note,note_id)
 if not n or n.owner_id!=user.id:raise HTTPException(404,'Note not found')
 for k,v in payload.model_dump(exclude_unset=True).items():setattr(n,k,v)
 n.version+=1;await db.commit();await db.refresh(n);return serialize(n)
@router.delete('/{note_id}',status_code=204)
async def delete(note_id:uuid.UUID,user:CurrentUser,db:DB):
 n=await db.get(Note,note_id)
 if not n or n.owner_id!=user.id:raise HTTPException(404,'Note not found')
 n.is_archived=True;await db.commit()
@router.post('/generate',response_model=StudyPackage)
async def generate(payload:GenerateNotesIn,request:Request,user:CurrentUser,db:DB):
 context=await retrieve(db,user.id,payload.topic,payload.source_ids) if payload.source_ids else []
 return await StudyOrchestrator().build(db,user.id,payload.topic,payload.mode,context,request.state.request_id)
@router.post('/generate/stream')
async def generate_stream(payload:GenerateNotesIn,request:Request,user:CurrentUser,db:DB):
 context=await retrieve(db,user.id,payload.topic,payload.source_ids) if payload.source_ids else []
 async def events():
  yield 'event: progress\ndata: {"progress":0.05,"stage":"planning"}\n\n'
  data=await StudyOrchestrator().build(db,user.id,payload.topic,payload.mode,context,request.state.request_id)
  yield f'event: result\ndata: {json.dumps(data,default=str)}\n\n'
 return StreamingResponse(events(),media_type='text/event-stream',headers={'Cache-Control':'no-cache','X-Accel-Buffering':'no'})
