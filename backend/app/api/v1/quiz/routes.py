from fastapi import APIRouter,Request
from app.api.deps import CurrentUser,DB
from app.ai.generation.assessment import generate_quiz
from app.database.models import QuizAttempt
from app.learning.progress import record
from app.schemas.learning import QuizAttemptIn,QuizGenerateIn,QuizOut
router=APIRouter(prefix='/quiz',tags=['quiz'])
@router.post('/generate',response_model=QuizOut)
async def generate(payload:QuizGenerateIn,request:Request,user:CurrentUser,db:DB):return {'questions':await generate_quiz(db,user.id,payload.topic,payload.count,request.state.request_id)}
@router.post('/attempts',status_code=201)
async def attempt(payload:QuizAttemptIn,user:CurrentUser,db:DB):
 row=QuizAttempt(owner_id=user.id,**payload.model_dump());db.add(row);progress=await record(db,user.id,payload.topic,payload.score,payload.total,mistake=f'{payload.total-payload.score} incorrect');await db.commit();return {'id':str(row.id),'mastery':progress.mastery,'confidence':progress.confidence}
