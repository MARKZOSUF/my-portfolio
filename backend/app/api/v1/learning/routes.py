from datetime import date,timedelta,datetime,timezone
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,Field
from typing import Literal
import uuid
from sqlalchemy import func
from app.database.models import StudyTaskHistory
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import Flashcard,Progress,StudyPlan,StudyTask
class PlanIn(BaseModel):name:str;exam_date:date;topics:list[str]=Field(min_length=1,max_length=100);daily_minutes:int=Field(ge=15,le=720)
router=APIRouter(prefix='/learning',tags=['learning'])
@router.post('/plans',status_code=201)
async def create(x:PlanIn,user:CurrentUser,db:DB):
 if x.exam_date<=date.today():raise HTTPException(422,'Future exam date required')
 p=StudyPlan(owner_id=user.id,name=x.name,exam_date=x.exam_date,daily_minutes=x.daily_minutes,strategy={'topics':x.topics});db.add(p);await db.flush();days=max(1,(x.exam_date-date.today()).days)
 for i in range(min(days,180)):
  d=date.today()+timedelta(days=i);phase=i/days;kind='learn' if phase<.5 else 'practice' if phase<.8 else 'revision';db.add(StudyTask(plan_id=p.id,owner_id=user.id,title=x.topics[i%len(x.topics)],scheduled_for=d,minutes=x.daily_minutes,kind=kind))
 await db.commit();return {'id':str(p.id),'tasks_created':min(days,180)}
@router.get('/plans')
async def plans(user:CurrentUser,db:DB):
 rows=(await db.scalars(select(StudyPlan).where(StudyPlan.owner_id==user.id).order_by(StudyPlan.exam_date))).all();return {'items':[{'id':str(x.id),'name':x.name,'exam_date':x.exam_date,'daily_minutes':x.daily_minutes,'strategy':x.strategy} for x in rows]}
@router.get('/revision')
async def revision(user:CurrentUser,db:DB):
 rows=(await db.scalars(select(Progress).where(Progress.owner_id==user.id).order_by(Progress.mastery).limit(30))).all();due=(await db.scalars(select(Flashcard).where(Flashcard.owner_id==user.id,Flashcard.due_at<=datetime.now(timezone.utc)).limit(200))).all();return {'due_flashcards':len(due),'recommendations':[{'topic':x.topic,'mastery':x.mastery,'confidence':x.confidence,'priority':round((1-x.mastery)*.7+(1-x.confidence)*.3,3)} for x in rows]}
@router.get('/progress')
async def progress(user:CurrentUser,db:DB):
 rows=(await db.scalars(select(Progress).where(Progress.owner_id==user.id).limit(200))).all();return {'items':[{'topic':x.topic,'mastery':x.mastery,'confidence':x.confidence,'mistakes':x.mistakes,'last_reviewed_at':x.last_reviewed_at} for x in rows]}

class TransitionIn(BaseModel):
 action:Literal['complete','skip','postpone','reschedule','restore'];scheduled_for:date|None=None;expected_version:int=Field(ge=1);reason:str|None=None;force:bool=False
@router.get('/tasks')
async def task_list(user:CurrentUser,db:DB,start:date|None=None,end:date|None=None):
 start=start or date.today();end=end or start+timedelta(days=6);rows=(await db.scalars(select(StudyTask).where(StudyTask.owner_id==user.id,StudyTask.scheduled_for.between(start,end)).order_by(StudyTask.scheduled_for).limit(500))).all();done=sum(x.status=='completed' for x in rows);return {'items':[{'id':str(x.id),'title':x.title,'scheduled_for':x.scheduled_for,'minutes':x.minutes,'kind':x.kind,'status':x.status,'version':x.version} for x in rows],'progress':done/max(1,len(rows)),'workload':{str(day):sum(x.minutes for x in rows if x.scheduled_for==day and x.status in {'planned','in_progress','postponed'}) for day in {x.scheduled_for for x in rows}}}
@router.post('/tasks/{task_id}/transition')
async def task_transition(task_id:uuid.UUID,x:TransitionIn,user:CurrentUser,db:DB):
 task=await db.scalar(select(StudyTask).where(StudyTask.id==task_id,StudyTask.owner_id==user.id).with_for_update())
 if not task:raise HTTPException(404,'Study task not found')
 if task.version!=x.expected_version:raise HTTPException(409,{'code':'VERSION_CONFLICT','message':'Task changed on another device','server_version':task.version})
 allowed={'complete':({'planned','in_progress','postponed','missed'},'completed'),'skip':({'planned','in_progress'},'skipped'),'postpone':({'planned','in_progress'},'postponed'),'reschedule':({'planned','postponed','missed','skipped'},'planned'),'restore':({'completed','skipped','missed','cancelled'},'planned')};states,target=allowed[x.action]
 if task.status not in states:raise HTTPException(409,'Invalid task transition')
 old_status,old_date=task.status,task.scheduled_for
 if x.action in {'postpone','reschedule'}:
  if not x.scheduled_for or x.scheduled_for<date.today():raise HTTPException(422,'A future scheduled_for is required')
  plan=await db.get(StudyPlan,task.plan_id);used=int(await db.scalar(select(func.coalesce(func.sum(StudyTask.minutes),0)).where(StudyTask.owner_id==user.id,StudyTask.scheduled_for==x.scheduled_for,StudyTask.id!=task.id,StudyTask.status.in_(['planned','in_progress','postponed']))) or 0)
  if used+task.minutes>plan.daily_minutes and not x.force:raise HTTPException(409,{'code':'WORKLOAD_CONFLICT','message':'Daily workload would exceed the plan limit','existing_minutes':used,'daily_limit':plan.daily_minutes})
  task.postponed_from=old_date if x.action=='postpone' else task.postponed_from;task.scheduled_for=x.scheduled_for
 if x.action=='restore':task.scheduled_for=x.scheduled_for or max(date.today(),task.postponed_from or old_date)
 task.status=target;task.completed_at=datetime.now(timezone.utc) if target=='completed' else None;task.version+=1;db.add(StudyTaskHistory(task_id=task.id,owner_id=user.id,from_status=old_status,to_status=target,from_date=old_date,to_date=task.scheduled_for,reason=x.reason));await db.commit();return {'id':str(task.id),'status':task.status,'scheduled_for':task.scheduled_for,'version':task.version}
