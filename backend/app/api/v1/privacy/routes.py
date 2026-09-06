from fastapi import APIRouter,HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import Document,Flashcard,Note,Profile,QuizAttempt,StudyPlan,User
from app.services.security import verify_password
from app.services.storage import get_storage
class Delete(BaseModel):password:str
router=APIRouter(prefix='/privacy',tags=['privacy'])
@router.get('/export')
async def export(user:CurrentUser,db:DB):
 async def rows(cls):return (await db.scalars(select(cls).where(cls.owner_id==user.id))).all()
 notes=await rows(Note);docs=await rows(Document);cards=await rows(Flashcard);attempts=await rows(QuizAttempt);plans=await rows(StudyPlan);profile=await db.scalar(select(Profile).where(Profile.user_id==user.id));return {'schema_version':'1.0','user':{'id':str(user.id),'email':user.email,'display_name':user.display_name},'profile':{'subjects':profile.subjects,'preferences':profile.preferences} if profile else None,'notes':[{'title':x.title,'content':x.content,'topic':x.topic} for x in notes],'documents':[{'name':x.name,'mime_type':x.mime_type,'sha256':x.sha256} for x in docs],'flashcards':[{'topic':x.topic,'front':x.front,'back':x.back,'due_at':x.due_at} for x in cards],'quiz_history':[{'topic':x.topic,'score':x.score,'total':x.total,'answers':x.answers} for x in attempts],'study_plans':[{'name':x.name,'exam_date':x.exam_date,'strategy':x.strategy} for x in plans]}
@router.post('/delete-account',status_code=204)
async def delete(x:Delete,user:CurrentUser,db:DB):
 if not verify_password(x.password,user.password_hash):raise HTTPException(401,'Password incorrect')
 docs=(await db.scalars(select(Document).where(Document.owner_id==user.id))).all()
 for d in docs:
  try:get_storage().delete(d.storage_key)
  except:pass
 await db.delete(user);await db.commit()
