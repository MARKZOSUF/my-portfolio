from collections import Counter,defaultdict
from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import PreviousYearQuestion
class Filter(BaseModel):exam:str|None=None;years:list[int]=[]
router=APIRouter(prefix='/exams',tags=['exams'])
@router.get('/pyqs')
async def pyqs(user:CurrentUser,db:DB):
 rows=(await db.scalars(select(PreviousYearQuestion).where(PreviousYearQuestion.owner_id==user.id).order_by(PreviousYearQuestion.year.desc()).limit(200))).all();return {'items':[{'id':str(x.id),'exam':x.exam,'year':x.year,'topic':x.topic,'prompt':x.prompt,'marks':x.marks,'source_id':str(x.source_id)} for x in rows]}
@router.post('/analysis')
async def analysis(x:Filter,user:CurrentUser,db:DB):
 q=select(PreviousYearQuestion).where(PreviousYearQuestion.owner_id==user.id)
 if x.exam:q=q.where(PreviousYearQuestion.exam==x.exam)
 if x.years:q=q.where(PreviousYearQuestion.year.in_(x.years))
 rows=(await db.scalars(q.limit(5000))).all();freq=Counter(r.topic for r in rows);marks=defaultdict(float)
 for r in rows:marks[r.topic]+=r.marks or 0
 return {'evidence_count':len(rows),'priorities':[{'topic':t,'historical_count':c,'historical_marks':marks[t],'priority':'HIGH' if c>=3 else 'MEDIUM' if c>=2 else 'LOW','confidence':min(.9,.35+c*.1)} for t,c in freq.most_common()],'disclaimer':'Historical priorities are probabilistic and do not guarantee future questions.' if rows else 'No verified PYQs matched; no prediction was generated.'}
@router.post('/priorities')
async def priorities(x:Filter,user:CurrentUser,db:DB):return await analysis(x,user,db)
