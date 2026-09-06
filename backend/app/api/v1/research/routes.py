import asyncio,hashlib,json,uuid
from fastapi import APIRouter,Header,HTTPException,Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import BackgroundTask,JobEvent,ResearchRun,TaskControl
from app.jobs.service import create_job,event
from app.schemas.research import ResearchRequest
from app.workers.research_tasks import deep_research_task
router=APIRouter(prefix='/research',tags=['research'])
@router.post('/jobs',status_code=202)
async def create(x:ResearchRequest,request:Request,user:CurrentUser,db:DB,idempotency_key:str|None=Header(default=None,alias='Idempotency-Key')):
 key=idempotency_key or hashlib.sha256(f'{user.id}:{x.model_dump_json()}'.encode()).hexdigest();task,new=await create_job(db,user.id,'deep_research',key)
 if new:
  run=ResearchRun(owner_id=user.id,query=x.query,status='queued',source_map={'request':x.model_dump()});db.add(run);await db.flush();task.result={'run_id':str(run.id)};job=deep_research_task.delay(str(user.id),str(run.id),str(task.id),x.model_dump(),request.state.request_id);task.celery_id=job.id
 await db.commit();return {'task_id':str(task.id),'run_id':task.result.get('run_id'),'status':task.status,'created':new}
@router.get('/jobs/{task_id}')
async def get(task_id:uuid.UUID,user:CurrentUser,db:DB):
 t=await db.scalar(select(BackgroundTask).where(BackgroundTask.id==task_id,BackgroundTask.owner_id==user.id,BackgroundTask.kind=='deep_research'))
 if not t:raise HTTPException(404,'Research job not found')
 return {'task_id':str(t.id),'kind':t.kind,'status':t.status,'progress':t.progress,'result':t.result,'error_code':t.error_code,'created_at':t.created_at,'updated_at':t.updated_at}
@router.post('/jobs/{task_id}/cancel',status_code=202)
async def cancel(task_id:uuid.UUID,user:CurrentUser,db:DB):
 c=await db.scalar(select(TaskControl).where(TaskControl.task_id==task_id,TaskControl.owner_id==user.id))
 if not c:raise HTTPException(404,'Job not found')
 c.cancel_requested=True;await event(db,task_id,'cancellation_requested',{});await db.commit();return {'status':'cancellation_requested'}
@router.get('/jobs/{task_id}/events')
async def events(task_id:uuid.UUID,user:CurrentUser,db:DB,last_event_id:int=0):
 t=await db.scalar(select(BackgroundTask).where(BackgroundTask.id==task_id,BackgroundTask.owner_id==user.id))
 if not t:raise HTTPException(404,'Job not found')
 async def stream():
  cursor=last_event_id
  for _ in range(120):
   rows=(await db.scalars(select(JobEvent).where(JobEvent.task_id==task_id,JobEvent.sequence>cursor).order_by(JobEvent.sequence))).all()
   for r in rows:cursor=r.sequence;yield f'id: {r.sequence}\nevent: {r.event_type}\ndata: {json.dumps(r.payload,default=str)}\n\n'
   await db.refresh(t)
   if t.status in {'succeeded','failed','cancelled','capability_unavailable','insufficient_evidence'} and not rows:break
   yield ': keep-alive\n\n';await asyncio.sleep(1)
 return StreamingResponse(stream(),media_type='text/event-stream',headers={'Cache-Control':'no-cache','X-Accel-Buffering':'no'})
