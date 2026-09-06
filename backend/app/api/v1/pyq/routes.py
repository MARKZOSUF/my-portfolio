"""Previous-year questions: listing plus repeat-pattern analysis.

Note: PreviousYearQuestion.source_id is NOT NULL with ondelete='RESTRICT', so
ingestion requires the caller to name the Source the paper came from. This keeps
every PYQ traceable to a real document.
"""
import uuid
from collections import Counter
from fastapi import APIRouter,HTTPException,Query
from pydantic import Field
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import PreviousYearQuestion,Source
from app.schemas.common import APIModel

router=APIRouter(prefix='/pyq',tags=['pyq'])

class PyqIn(APIModel):
 exam:str=Field(min_length=1,max_length=180)
 year:int=Field(ge=1950,le=2100)
 topic:str=Field(min_length=1,max_length=220)
 prompt:str=Field(min_length=1)
 marks:float|None=None
 source_id:uuid.UUID

class PyqOut(APIModel):
 id:str;exam:str;year:int;topic:str;prompt:str;marks:float|None

class TopicPattern(APIModel):
 topic:str;frequency:int;share:float;years:list[int];total_marks:float

def serialize(p:PreviousYearQuestion)->PyqOut:
 return PyqOut(id=str(p.id),exam=p.exam,year=p.year,topic=p.topic,prompt=p.prompt,marks=p.marks)

@router.get('')
async def list_pyq(user:CurrentUser,db:DB,exam:str|None=None,year:int|None=None,topic:str|None=None,limit:int=Query(50,ge=1,le=200)):
 stmt=select(PreviousYearQuestion).where(PreviousYearQuestion.owner_id==user.id).order_by(PreviousYearQuestion.year.desc()).limit(limit)
 if exam:stmt=stmt.where(PreviousYearQuestion.exam.ilike(f'%{exam}%'))
 if year is not None:stmt=stmt.where(PreviousYearQuestion.year==year)
 if topic:stmt=stmt.where(PreviousYearQuestion.topic.ilike(f'%{topic}%'))
 rows=(await db.scalars(stmt)).all();return {'items':[serialize(x) for x in rows]}

@router.post('',response_model=PyqOut,status_code=201)
async def create_pyq(payload:PyqIn,user:CurrentUser,db:DB):
 source=await db.get(Source,payload.source_id)
 if not source or getattr(source,'owner_id',user.id)!=user.id:raise HTTPException(404,'Source not found')
 row=PreviousYearQuestion(owner_id=user.id,exam=payload.exam,year=payload.year,topic=payload.topic,prompt=payload.prompt,marks=payload.marks,source_id=payload.source_id)
 db.add(row);await db.commit();await db.refresh(row);return serialize(row)

@router.post('/analyze')
async def analyze(user:CurrentUser,db:DB,exam:str|None=None,since_year:int|None=None):
 """Ranks topics by how often they recur across past papers."""
 stmt=select(PreviousYearQuestion).where(PreviousYearQuestion.owner_id==user.id)
 if exam:stmt=stmt.where(PreviousYearQuestion.exam.ilike(f'%{exam}%'))
 if since_year is not None:stmt=stmt.where(PreviousYearQuestion.year>=since_year)
 rows=(await db.scalars(stmt)).all()
 if not rows:return {'total':0,'patterns':[],'years':[]}
 counts=Counter(r.topic for r in rows);total=len(rows)
 years:dict[str,set[int]]={};marks:dict[str,float]={}
 for r in rows:
  years.setdefault(r.topic,set()).add(r.year)
  marks[r.topic]=marks.get(r.topic,0.0)+float(r.marks or 0)
 patterns=[TopicPattern(topic=t,frequency=n,share=round(n/total,4),years=sorted(years.get(t,set())),total_marks=round(marks.get(t,0.0),2)) for t,n in counts.most_common()]
 return {'total':total,'patterns':patterns,'years':sorted({r.year for r in rows})}
