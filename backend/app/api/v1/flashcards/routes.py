import uuid
from fastapi import APIRouter,HTTPException,Request
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.ai.generation.assessment import generate_flashcards
from app.database.models import Flashcard,FlashcardReview
from app.learning.spaced_repetition import schedule
from app.learning.progress import record
from app.schemas.learning import FlashcardGenerateIn,FlashcardsOut,ReviewIn
router=APIRouter(prefix='/flashcards',tags=['flashcards'])
@router.post('/generate',response_model=FlashcardsOut)
async def generate(payload:FlashcardGenerateIn,request:Request,user:CurrentUser,db:DB):
 items=await generate_flashcards(db,user.id,payload.topic,payload.count,request.state.request_id);rows=[]
 for x in items:
  r=Flashcard(owner_id=user.id,topic=payload.topic,front=x['front'],back=x['back']);db.add(r);rows.append(r)
 await db.commit()
 for r in rows:await db.refresh(r)
 return {'cards':[{'id':str(r.id),'front':r.front,'back':r.back,'due_at':r.due_at,'interval_days':r.interval_days,'ease':r.ease,'bookmarked':r.bookmarked} for r in rows]}
@router.post('/{card_id}/review')
async def review(card_id:uuid.UUID,payload:ReviewIn,user:CurrentUser,db:DB):
 card=await db.get(Flashcard,card_id)
 if not card or card.owner_id!=user.id:raise HTTPException(404,'Flashcard not found')
 old=card.interval_days;next=schedule(card.interval_days,card.ease,card.repetitions,payload.quality);card.interval_days=next.interval_days;card.ease=next.ease;card.repetitions=next.repetitions;card.due_at=next.due_at;db.add(FlashcardReview(flashcard_id=card.id,owner_id=user.id,quality=payload.quality,previous_interval=old,next_interval=next.interval_days));await record(db,user.id,card.topic,1 if payload.quality>=3 else 0,kind='flashcard',mistake='Recall failed');await db.commit();return {'due_at':card.due_at,'interval_days':card.interval_days,'ease':card.ease}
