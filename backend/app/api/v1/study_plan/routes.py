"""Study plans: create a plan, generate its task schedule, and adapt it.

Tasks are laid out from today up to the exam date, respecting the learner's
daily_minutes budget and interleaving study / practice / revision passes.
"""
import uuid
from datetime import date,timedelta
from fastapi import APIRouter,HTTPException,Query
from pydantic import Field
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import StudyPlan,StudyTask
from app.schemas.common import APIModel

router=APIRouter(prefix='/study-plan',tags=['study-plan'])

TASK_CYCLE=('study','practice','revision')

class StudyPlanIn(APIModel):
 name:str=Field(min_length=2,max_length=220)
 exam_date:date
 topics:list[str]=Field(min_length=1,max_length=100)
 daily_minutes:int=Field(default=60,ge=15,le=720)

class StudyPlanOut(APIModel):
 id:str;name:str;exam_date:date;daily_minutes:int;strategy:dict;tasks_created:int=0

class StudyTaskOut(APIModel):
 id:str;plan_id:str;title:str;scheduled_for:date;minutes:int;kind:str;status:str;version:int

def serialize_plan(p:StudyPlan,tasks_created:int=0)->StudyPlanOut:
 return StudyPlanOut(id=str(p.id),name=p.name,exam_date=p.exam_date,daily_minutes=p.daily_minutes,strategy=p.strategy or {},tasks_created=tasks_created)

def serialize_task(t:StudyTask)->StudyTaskOut:
 return StudyTaskOut(id=str(t.id),plan_id=str(t.plan_id),title=t.title,scheduled_for=t.scheduled_for,minutes=t.minutes,kind=t.kind,status=t.status,version=t.version)

def plan_tasks(plan_id:uuid.UUID,owner_id:uuid.UUID,topics:list[str],start:date,exam_date:date,daily_minutes:int)->list[StudyTask]:
 """Round-robins topics across available days, then adds a final revision day."""
 days=max((exam_date-start).days,1)
 slot_minutes=max(daily_minutes//2,20)
 per_day=max(daily_minutes//slot_minutes,1)
 tasks:list[StudyTask]=[]
 index=0
 for offset in range(days):
  day=start+timedelta(days=offset)
  for _ in range(per_day):
   topic=topics[index%len(topics)]
   kind=TASK_CYCLE[(index//len(topics))%len(TASK_CYCLE)]
   tasks.append(StudyTask(plan_id=plan_id,owner_id=owner_id,title=f'{kind.title()}: {topic}'[:255],scheduled_for=day,minutes=slot_minutes,kind=kind,status='planned'))
   index+=1
  if len(tasks)>=len(topics)*len(TASK_CYCLE):break
 if exam_date>start:
  tasks.append(StudyTask(plan_id=plan_id,owner_id=owner_id,title='Full syllabus revision'[:255],scheduled_for=exam_date-timedelta(days=1),minutes=daily_minutes,kind='revision',status='planned'))
 return tasks

@router.post('',response_model=StudyPlanOut,status_code=201)
async def create_plan(payload:StudyPlanIn,user:CurrentUser,db:DB):
 today=date.today()
 if payload.exam_date<today:raise HTTPException(422,'Exam date is in the past')
 topics=[t.strip() for t in payload.topics if t.strip()]
 if not topics:raise HTTPException(422,'Provide at least one non-empty topic')
 plan=StudyPlan(owner_id=user.id,name=payload.name,exam_date=payload.exam_date,daily_minutes=payload.daily_minutes,strategy={'topics':topics,'generated_from':today.isoformat(),'cycle':list(TASK_CYCLE)})
 db.add(plan);await db.commit();await db.refresh(plan)
 tasks=plan_tasks(plan.id,user.id,topics,today,payload.exam_date,payload.daily_minutes)
 for t in tasks:db.add(t)
 await db.commit()
 return serialize_plan(plan,len(tasks))

@router.get('')
async def list_plans(user:CurrentUser,db:DB,limit:int=Query(20,ge=1,le=100)):
 rows=(await db.scalars(select(StudyPlan).where(StudyPlan.owner_id==user.id).order_by(StudyPlan.exam_date.asc()).limit(limit))).all()
 return {'items':[serialize_plan(p) for p in rows]}

@router.get('/{plan_id}')
async def get_plan(plan_id:uuid.UUID,user:CurrentUser,db:DB):
 plan=await db.get(StudyPlan,plan_id)
 if not plan or plan.owner_id!=user.id:raise HTTPException(404,'Study plan not found')
 tasks=(await db.scalars(select(StudyTask).where(StudyTask.plan_id==plan.id).order_by(StudyTask.scheduled_for.asc()))).all()
 done=sum(1 for t in tasks if t.status=='completed')
 return {'plan':serialize_plan(plan,len(tasks)),'tasks':[serialize_task(t) for t in tasks],'progress':round(done/len(tasks),4) if tasks else 0.0}

@router.delete('/{plan_id}',status_code=204)
async def delete_plan(plan_id:uuid.UUID,user:CurrentUser,db:DB):
 plan=await db.get(StudyPlan,plan_id)
 if not plan or plan.owner_id!=user.id:raise HTTPException(404,'Study plan not found')
 await db.delete(plan);await db.commit()

@router.post('/{plan_id}/adapt')
async def adapt_plan(plan_id:uuid.UUID,user:CurrentUser,db:DB):
 """Rolls every overdue, still-planned task forward to today."""
 plan=await db.get(StudyPlan,plan_id)
 if not plan or plan.owner_id!=user.id:raise HTTPException(404,'Study plan not found')
 today=date.today()
 overdue=(await db.scalars(select(StudyTask).where(StudyTask.plan_id==plan.id,StudyTask.owner_id==user.id,StudyTask.status=='planned',StudyTask.scheduled_for<today))).all()
 for t in overdue:
  t.postponed_from=t.scheduled_for;t.scheduled_for=today;t.version+=1
 await db.commit()
 return {'rescheduled':len(overdue),'to':today.isoformat()}
