import hashlib
from fastapi import APIRouter,HTTPException
from pydantic import BaseModel,Field,HttpUrl
from app.api.deps import CurrentUser,DB
from app.jobs.service import create_job
from app.workers.tasks import process_youtube,youtube_id
class Input(BaseModel):url:HttpUrl;languages:list[str]=Field(default_factory=lambda:['en'],min_length=1,max_length=5)
router=APIRouter(prefix='/youtube',tags=['youtube'])
@router.post('/process',status_code=202)
async def process(x:Input,user:CurrentUser,db:DB):
 try:vid=youtube_id(str(x.url))
 except ValueError as e:raise HTTPException(422,str(e))
 task,new=await create_job(db,user.id,'youtube_ingestion',hashlib.sha256(f'{user.id}:{vid}:{x.languages}'.encode()).hexdigest())
 if new:job=process_youtube.delay(str(x.url),str(user.id),str(task.id),x.languages);task.celery_id=job.id;task.result={'video_id':vid}
 await db.commit();return {'task_id':str(task.id),'status':task.status,'created':new,'video_id':vid}
