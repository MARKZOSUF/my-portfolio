from datetime import datetime,timezone
from sqlalchemy import select,text
from app.database.models import BackgroundTask,JobEvent,TaskControl
async def event(db,task_id,kind,payload):
 sequence=int((await db.execute(text("SELECT nextval('job_events_id_seq')"))).scalar_one());db.add(JobEvent(task_id=task_id,sequence=sequence,event_type=kind,payload=payload));return sequence
async def create_job(db,owner_id,kind,key):
 await db.execute(text('SELECT pg_advisory_xact_lock(hashtext(:k))'),{'k':f'{owner_id}:{key}'});control=await db.scalar(select(TaskControl).where(TaskControl.owner_id==owner_id,TaskControl.idempotency_key==key))
 if control:return await db.get(BackgroundTask,control.task_id),False
 task=BackgroundTask(owner_id=owner_id,kind=kind,status='queued',progress=0);db.add(task);await db.flush();db.add(TaskControl(task_id=task.id,owner_id=owner_id,idempotency_key=key));await event(db,task.id,'queued',{});return task,True
async def update(db,task_id,status,progress,kind=None,payload=None,result=None,error=None):
 task=await db.get(BackgroundTask,task_id);task.status=status;task.progress=progress;task.result=result if result is not None else task.result;task.error_code=error;task.last_error=error;now=datetime.now(timezone.utc)
 if status in {'running','processing'} and not task.started_at:task.started_at=now
 if status in {'completed','failed','cancelled'}:task.finished_at=now
 await event(db,task_id,kind or status,payload or {'status':status,'progress':progress});return task
async def cancelled(db,task_id):
 row=await db.scalar(select(TaskControl).where(TaskControl.task_id==task_id));return bool(row and row.cancel_requested)
