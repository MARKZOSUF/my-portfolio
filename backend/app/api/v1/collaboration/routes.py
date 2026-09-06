import hashlib,secrets,uuid
from datetime import datetime,timedelta,timezone
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import CollaborationPermission,Comment,Note
class ShareIn(BaseModel):role:str=Field(pattern='^(viewer|commenter|editor)$');expires_days:int=Field(default=7,ge=1,le=90)
class ConsumeIn(BaseModel):token:str=Field(min_length=20,max_length=200)
class CommentIn(BaseModel):body:str=Field(min_length=1,max_length=5000);anchor:dict|None=None
router=APIRouter(prefix='/collaboration',tags=['collaboration']);rank={'viewer':1,'commenter':2,'editor':3}
async def access(db,note_id,user,need='viewer'):
 note=await db.get(Note,note_id)
 if not note or note.is_archived:raise HTTPException(404,'Note not found')
 if note.owner_id==user:return note,'owner'
 now=datetime.now(timezone.utc);permission=await db.scalar(select(CollaborationPermission).where(CollaborationPermission.note_id==note_id,CollaborationPermission.grantee_id==user,CollaborationPermission.revoked_at.is_(None),((CollaborationPermission.expires_at.is_(None))|(CollaborationPermission.expires_at>now))))
 if not permission or rank.get(permission.role,0)<rank[need]:raise HTTPException(403,'Permission denied')
 return note,permission.role
@router.post('/notes/{note_id}/share')
async def share(note_id:uuid.UUID,payload:ShareIn,user:CurrentUser,db:DB):
 note=await db.get(Note,note_id)
 if not note or note.owner_id!=user.id:raise HTTPException(404,'Note not found')
 raw=secrets.token_urlsafe(40);row=CollaborationPermission(owner_id=user.id,note_id=note.id,role=payload.role,share_token_hash=hashlib.sha256(raw.encode()).hexdigest(),expires_at=datetime.now(timezone.utc)+timedelta(days=payload.expires_days));db.add(row);await db.commit();return {'id':str(row.id),'share_token':raw,'role':row.role,'expires_at':row.expires_at}
@router.post('/shares/consume')
async def consume(payload:ConsumeIn,user:CurrentUser,db:DB):
 row=await db.scalar(select(CollaborationPermission).where(CollaborationPermission.share_token_hash==hashlib.sha256(payload.token.encode()).hexdigest()).with_for_update());now=datetime.now(timezone.utc)
 if not row or row.revoked_at or (row.expires_at and row.expires_at<=now):raise HTTPException(400,'Share link invalid, expired, or revoked')
 if row.grantee_id and row.grantee_id!=user.id:raise HTTPException(409,'Share already claimed')
 row.grantee_id=user.id;row.consumed_at=now;row.share_token_hash=None;await db.commit();return {'note_id':str(row.note_id),'role':row.role}
@router.get('/notes/{note_id}')
async def note(note_id:uuid.UUID,user:CurrentUser,db:DB):
 row,role=await access(db,note_id,user.id);return {'id':str(row.id),'title':row.title,'content':row.content,'role':role,'version':row.version}
@router.get('/notes/{note_id}/comments')
async def comments(note_id:uuid.UUID,user:CurrentUser,db:DB):
 await access(db,note_id,user.id);rows=(await db.scalars(select(Comment).where(Comment.note_id==note_id,Comment.is_deleted.is_(False)).order_by(Comment.created_at))).all();return {'items':[{'id':str(x.id),'author_id':str(x.author_id),'body':x.body,'anchor':x.anchor} for x in rows]}
@router.post('/notes/{note_id}/comments',status_code=201)
async def comment(note_id:uuid.UUID,payload:CommentIn,user:CurrentUser,db:DB):
 note,_=await access(db,note_id,user.id,'commenter');row=Comment(note_id=note.id,author_id=user.id,body=payload.body,anchor=payload.anchor);db.add(row);await db.commit();return {'id':str(row.id)}
@router.delete('/shares/{share_id}',status_code=204)
async def revoke(share_id:uuid.UUID,user:CurrentUser,db:DB):
 row=await db.scalar(select(CollaborationPermission).where(CollaborationPermission.id==share_id,CollaborationPermission.owner_id==user.id))
 if not row:raise HTTPException(404,'Share not found')
 row.revoked_at=datetime.now(timezone.utc);row.share_token_hash=None;await db.commit()
@router.delete('/comments/{comment_id}',status_code=204)
async def delete_comment(comment_id:uuid.UUID,user:CurrentUser,db:DB):
 row=await db.get(Comment,comment_id)
 if not row:raise HTTPException(404,'Comment not found')
 note=await db.get(Note,row.note_id)
 if row.author_id!=user.id and note.owner_id!=user.id:raise HTTPException(403,'Permission denied')
 row.is_deleted=True;row.body='';await db.commit()
