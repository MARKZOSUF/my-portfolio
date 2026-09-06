"""Revision queue: due flashcards and ranked topic recommendations."""
from datetime import datetime,timedelta,timezone
from fastapi import APIRouter,Query
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import Flashcard,Progress
from app.schemas.common import APIModel

router=APIRouter(prefix='/revision',tags=['revision'])

class DueCard(APIModel):
 id:str;front:str;back:str;topic:str;due_at:datetime;interval_days:int;ease:float;bookmarked:bool

class Recommendation(APIModel):
 topic:str;mastery:float;confidence:float;priority:float;reason:str;last_reviewed_at:datetime|None

def _priority(p:Progress)->float:
 """Weakest and least-confident topics first; stale topics get a recency nudge."""
 staleness=0.0
 if p.last_reviewed_at is not None:
  days=(datetime.now(timezone.utc)-p.last_reviewed_at).days
  staleness=min(max(days,0)/30.0,1.0)
 else:
  staleness=1.0
 return round((1-p.mastery)*0.55+(1-p.confidence)*0.25+staleness*0.20,4)

def _reason(p:Progress)->str:
 if p.mastery<0.35:return 'Low mastery \u2014 relearn the fundamentals.'
 if p.confidence<0.4:return 'You marked this as low confidence.'
 if p.mistake_count>p.correct_count:return 'More mistakes than correct attempts.'
 if p.last_reviewed_at is None:return 'Never reviewed.'
 return 'Due for a spaced-repetition pass.'

@router.get('/due')
async def due_cards(user:CurrentUser,db:DB,limit:int=Query(50,ge=1,le=200)):
 now=datetime.now(timezone.utc)
 stmt=select(Flashcard).where(Flashcard.owner_id==user.id,Flashcard.due_at<=now).order_by(Flashcard.due_at.asc()).limit(limit)
 rows=(await db.scalars(stmt)).all()
 cards=[DueCard(id=str(c.id),front=c.front,back=c.back,topic=c.topic,due_at=c.due_at,interval_days=c.interval_days,ease=c.ease,bookmarked=c.bookmarked) for c in rows]
 return {'cards':cards,'count':len(cards)}

@router.get('/recommendations')
async def recommendations(user:CurrentUser,db:DB,limit:int=Query(15,ge=1,le=50)):
 now=datetime.now(timezone.utc)
 due=(await db.scalars(select(Flashcard).where(Flashcard.owner_id==user.id,Flashcard.due_at<=now))).all()
 rows=(await db.scalars(select(Progress).where(Progress.owner_id==user.id))).all()
 ranked=sorted(rows,key=_priority,reverse=True)[:limit]
 items=[Recommendation(topic=p.topic,mastery=round(p.mastery,4),confidence=round(p.confidence,4),priority=_priority(p),reason=_reason(p),last_reviewed_at=p.last_reviewed_at) for p in ranked]
 return {'due_flashcards':len(due),'recommendations':items,'topic_count':len(rows)}

@router.get('/upcoming')
async def upcoming(user:CurrentUser,db:DB,days:int=Query(7,ge=1,le=60)):
 """Per-day count of cards falling due, for the revision calendar."""
 now=datetime.now(timezone.utc);horizon=now+timedelta(days=days)
 rows=(await db.scalars(select(Flashcard).where(Flashcard.owner_id==user.id,Flashcard.due_at<=horizon))).all()
 buckets:dict[str,int]={}
 for c in rows:
  key=c.due_at.date().isoformat() if c.due_at>now else now.date().isoformat()
  buckets[key]=buckets.get(key,0)+1
 return {'buckets':dict(sorted(buckets.items())),'total':len(rows)}
