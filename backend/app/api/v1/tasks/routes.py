import uuid
from fastapi import APIRouter,HTTPException
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import BackgroundTask,JobEvent,TaskControl
from app.jobs.service import event
router=APIRouter(prefix='/tasks',tags=['tasks'])
@router.get('/{id}')
async def get(id:uuid.UUID,user:CurrentUser,db:DB):
 t=await db.scalar(select(BackgroundTask).where(BackgroundTask.id==id,BackgroundTask.owner_id==user.id))
 if not t:raise HTTPException(404,'Task not found')
 return {'task_id':str(t.id),'kind':t.kind,'status':t.status,'progress':t.progress,'result':t.result,'error_code':t.error_code,'created_at':t.created_at,'updated_at':t.updated_at}
@router.get('/{id}/events')
async def events(id:uuid.UUID,user:CurrentUser,db:DB,after:int=0):
 t=await db.scalar(select(BackgroundTask).where(BackgroundTask.id==id,BackgroundTask.owner_id==user.id))
 if not t:raise HTTPException(404,'Task not found')
 rows=(await db.scalars(select(JobEvent).where(JobEvent.task_id==id,JobEvent.sequence>after).order_by(JobEvent.sequence).limit(200))).all();return {'items':[{'sequence':x.sequence,'event_type':x.event_type,'payload':x.payload,'created_at':x.created_at} for x in rows]}
@router.post('/{id}/cancel',status_code=202)
async def cancel(id:uuid.UUID,user:CurrentUser,db:DB):
 c=await db.scalar(select(TaskControl).where(TaskControl.task_id==id,TaskControl.owner_id==user.id))
 if not c:raise HTTPException(404,'Task not found')
 c.cancel_requested=True;await event(db,id,'cancellation_requested',{});await db.commit();return {'status':'cancellation_requested'}
