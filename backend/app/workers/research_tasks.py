import asyncio,uuid
from app.database.session import SessionLocal
from app.jobs.service import update
from app.research.engine import run
from app.workers.celery_app import celery
async def go(user,run_id,task,payload,request_id):
 async with SessionLocal() as db:return await run(db,uuid.UUID(user),uuid.UUID(run_id),uuid.UUID(task),payload,request_id)
@celery.task(bind=True,max_retries=3,name='research.deep',retry_backoff=True,retry_jitter=True)
def deep_research_task(self,user,run_id,task,payload,request_id):
 try:return asyncio.run(go(user,run_id,task,payload,request_id))
 except Exception as e:
  async def fail():
   async with SessionLocal() as db:await update(db,uuid.UUID(task),'failed',1,'failed',{'error_code':type(e).__name__},error=type(e).__name__);await db.commit()
  asyncio.run(fail())
  if self.request.retries<self.max_retries:raise self.retry(exc=e)
  raise
