import hashlib,uuid
from pathlib import Path
from fastapi import APIRouter,File,Header,HTTPException,UploadFile,Request
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.config.settings import get_settings
from app.database.models import Document
from app.documents.security import inspect,malware,UnsafeDocument
from app.jobs.service import create_job
from app.services.storage import get_storage
from app.workers.tasks import process_document
router=APIRouter(prefix='/documents',tags=['documents']);s=get_settings()
@router.get('')
async def list_documents(user:CurrentUser,db:DB):
 rows=(await db.scalars(select(Document).where(Document.owner_id==user.id).order_by(Document.created_at.desc()).limit(100))).all();return {'items':[{'id':str(x.id),'name':x.name,'mime_type':x.mime_type,'status':x.status,'page_count':x.page_count,'error_code':x.error_code} for x in rows]}
@router.post('',status_code=202)
async def upload(user:CurrentUser,db:DB,file:UploadFile=File(...),idempotency_key:str|None=Header(default=None,alias='Idempotency-Key')):
 mime=file.content_type or '';data=await file.read(s.max_upload_mb*1024*1024+1)
 if mime not in s.allowed_mime_types:raise HTTPException(415,'Unsupported type')
 if len(data)>s.max_upload_mb*1024*1024:raise HTTPException(413,'File too large')
 try:inspect(data,mime);malware(data)
 except UnsafeDocument as e:raise HTTPException(415,str(e))
 sha=hashlib.sha256(data).hexdigest();old=await db.scalar(select(Document).where(Document.owner_id==user.id,Document.sha256==sha,Document.status!='failed'))
 if old:return {'id':str(old.id),'status':old.status,'duplicate':True,'task_id':None}
 from io import BytesIO
 key=get_storage().put(BytesIO(data),Path(file.filename or '').suffix);doc=Document(owner_id=user.id,name=Path(file.filename or 'document').name,mime_type=mime,size_bytes=len(data),storage_key=key,sha256=sha,status='queued');db.add(doc);await db.flush();task,new=await create_job(db,user.id,'document_ingestion',idempotency_key or 'doc:'+sha);task.result={'document_id':str(doc.id)};job=process_document.delay(str(doc.id),str(task.id));task.celery_id=job.id;await db.commit();return {'id':str(doc.id),'task_id':str(task.id),'status':'queued','duplicate':False}

@router.post('/vision/analyze')
async def vision_analyze(request:Request,user:CurrentUser,db:DB,file:UploadFile=File(...)):
 from app.ai.vision.service import VisionUnavailable,analyze
 mime=file.content_type or '';data=await file.read(8*1024*1024+1)
 if mime not in {'image/jpeg','image/png','image/webp'}:raise HTTPException(415,'Vision accepts JPEG, PNG, or WebP')
 if len(data)>8*1024*1024:raise HTTPException(413,'Image is too large')
 try:inspect(data,mime);malware(data);result=await analyze(db,user.id,data,mime,request.state.request_id)
 except VisionUnavailable as exc:raise HTTPException(503,{'code':'CAPABILITY_UNAVAILABLE','message':str(exc)})
 return result.model_dump()
