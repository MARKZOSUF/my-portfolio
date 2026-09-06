"""Practice questions.

Generation reuses the shared artifact router (kind='questions'); the endpoints
below additionally expose the normalised `questions` table so the quiz engine and
progress tracker can query individual rows.
"""
import uuid
from fastapi import HTTPException,Query
from pydantic import Field
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import Question
from app.knowledge.artifacts import build_artifact_router
from app.schemas.common import APIModel

router=build_artifact_router('questions','/questions','questions',mode='exam_mode')

QUESTION_TYPES=('mcq','true_false','fill_blank','short_answer','numerical','conceptual','viva')
DIFFICULTIES=('easy','medium','hard')

class QuestionIn(APIModel):
 topic:str=Field(min_length=1,max_length=220)
 type:str='mcq'
 prompt:str=Field(min_length=1)
 options:list[str]|None=None
 answer:str
 explanation:str=''
 difficulty:str='medium'

class QuestionOut(APIModel):
 id:str;topic:str;type:str;prompt:str;options:list[str]|None;answer:str;explanation:str;difficulty:str

def serialize(q:Question)->QuestionOut:
 return QuestionOut(id=str(q.id),topic=q.topic,type=q.type,prompt=q.prompt,options=q.options,answer=q.answer,explanation=q.explanation,difficulty=q.difficulty)

@router.post('/bulk',status_code=201)
async def bulk_create(payload:list[QuestionIn],user:CurrentUser,db:DB):
 """Persists reviewed questions as individual rows."""
 if not payload:raise HTTPException(422,'Provide at least one question')
 if len(payload)>200:raise HTTPException(422,'At most 200 questions per request')
 rows:list[Question]=[]
 for item in payload:
  if item.type not in QUESTION_TYPES:raise HTTPException(422,f'Unknown question type: {item.type}')
  if item.difficulty not in DIFFICULTIES:raise HTTPException(422,f'Unknown difficulty: {item.difficulty}')
  rows.append(Question(owner_id=user.id,topic=item.topic,type=item.type,prompt=item.prompt,options=item.options,answer=item.answer,explanation=item.explanation,difficulty=item.difficulty))
 for r in rows:db.add(r)
 await db.commit()
 for r in rows:await db.refresh(r)
 return {'items':[serialize(x) for x in rows],'created':len(rows)}

@router.get('/rows')
async def list_rows(user:CurrentUser,db:DB,topic:str|None=None,difficulty:str|None=None,type:str|None=None,limit:int=Query(50,ge=1,le=200)):
 stmt=select(Question).where(Question.owner_id==user.id).order_by(Question.created_at.desc()).limit(limit)
 if topic:stmt=stmt.where(Question.topic.ilike(f'%{topic}%'))
 if difficulty:stmt=stmt.where(Question.difficulty==difficulty)
 if type:stmt=stmt.where(Question.type==type)
 rows=(await db.scalars(stmt)).all();return {'items':[serialize(x) for x in rows]}

@router.delete('/rows/{question_id}',status_code=204)
async def delete_row(question_id:uuid.UUID,user:CurrentUser,db:DB):
 q=await db.get(Question,question_id)
 if not q or q.owner_id!=user.id:raise HTTPException(404,'Question not found')
 await db.delete(q);await db.commit()
