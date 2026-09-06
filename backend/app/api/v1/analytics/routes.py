from datetime import date,datetime,timedelta,timezone
from fastapi import APIRouter
from sqlalchemy import func,select
from app.api.deps import CurrentUser,DB
from app.database.models import Exam,Flashcard,Note,Progress,QuizAttempt,StudyActivity,StudyTask
router=APIRouter(prefix='/analytics',tags=['analytics'])
def streak(days):
 days=sorted(set(days),reverse=True);current=longest=run=0
 for i,day in enumerate(days):
  if i==0:run=1
  elif (days[i-1]-day).days==1:run+=1
  else:run=1
  longest=max(longest,run)
 if days and days[0] in {date.today(),date.today()-timedelta(days=1)}:
  current=1
  for a,b in zip(days,days[1:]):
   if (a-b).days!=1:break
   current+=1
 return current,longest
@router.get('/dashboard')
async def dashboard(user:CurrentUser,db:DB):
 now=datetime.now(timezone.utc);notes=(await db.scalars(select(Note).where(Note.owner_id==user.id,Note.is_archived.is_(False)).order_by(Note.updated_at.desc()).limit(5))).all();attempts=(await db.scalars(select(QuizAttempt).where(QuizAttempt.owner_id==user.id).order_by(QuizAttempt.created_at.desc()).limit(100))).all();progress=(await db.scalars(select(Progress).where(Progress.owner_id==user.id).order_by(Progress.mastery).limit(200))).all();activities=(await db.scalars(select(StudyActivity).where(StudyActivity.owner_id==user.id,StudyActivity.occurred_at>=now-timedelta(days=365)))).all();current,longest=streak([x.occurred_at.date() for x in activities]);due=int(await db.scalar(select(func.count()).select_from(Flashcard).where(Flashcard.owner_id==user.id,Flashcard.due_at<=now)) or 0);exam=await db.scalar(select(Exam).where(Exam.owner_id==user.id,Exam.exam_date>=date.today()).order_by(Exam.exam_date));accuracy=sum(x.score for x in attempts)/max(1,sum(x.total for x in attempts));return {'streak':current,'longestStreak':longest,'studyMinutes':sum(x.minutes for x in activities),'weeklyStudyMinutes':sum(x.minutes for x in activities if x.occurred_at>=now-timedelta(days=7)),'monthlyStudyMinutes':sum(x.minutes for x in activities if x.occurred_at>=now-timedelta(days=30)),'quizAccuracy':round(accuracy,4),'courseProgress':round(sum(x.mastery for x in progress)/max(1,len(progress)),4),'revisionCount':due,'recentNotes':[{'id':str(x.id),'title':x.title,'topic':x.topic} for x in notes],'weakTopics':[{'topic':x.topic,'score':x.mastery,'mistakes':x.mistake_count} for x in progress[:5]],'recommendedTopics':[x.topic for x in progress[:3]],'continueLearning':None,'upcomingExam':({'id':str(exam.id),'name':exam.name,'date':exam.exam_date} if exam else None)}
