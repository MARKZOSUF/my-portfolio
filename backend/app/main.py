import asyncio,uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI,HTTPException,Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import ORJSONResponse,Response
from prometheus_client import CONTENT_TYPE_LATEST,generate_latest
from redis.asyncio import Redis
from sqlalchemy import text
from starlette.middleware.trustedhost import TrustedHostMiddleware
from app.ai.usage import AIQuotaExceeded
from app.api.v1.router import api_router
from app.config.logging import configure_logging
from app.config.settings import get_settings
from app.database.session import engine
from app.services.rate_limit import RateLimitMiddleware
from app.services.storage import get_storage
s=get_settings();configure_logging()
@asynccontextmanager
async def lifespan(app):yield
app=FastAPI(title=s.app_name,version='3.0.0',default_response_class=ORJSONResponse,docs_url=None if s.is_production else '/docs',lifespan=lifespan);app.add_middleware(TrustedHostMiddleware,allowed_hosts=s.trusted_hosts);app.add_middleware(CORSMiddleware,allow_origins=s.cors_origins,allow_credentials=True,allow_methods=['GET','POST','PUT','PATCH','DELETE'],allow_headers=['Authorization','Content-Type','X-Request-ID','Idempotency-Key']);app.add_middleware(GZipMiddleware,minimum_size=1000);app.add_middleware(RateLimitMiddleware)
def err(code,message,rid,details=None):return {'success':False,'error':{'code':code,'message':message,'details':details or {}},'request_id':rid}
@app.middleware('http')
async def secure(request:Request,call_next):
 request.state.request_id=request.headers.get('X-Request-ID',str(uuid.uuid4()))[:128];length=request.headers.get('content-length')
 if length and length.isdigit() and int(length)>s.max_request_mb*1024*1024:return ORJSONResponse(err('REQUEST_TOO_LARGE','Request too large',request.state.request_id),413)
 response=await call_next(request);response.headers.update({'X-Request-ID':request.state.request_id,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()'});return response
@app.exception_handler(AIQuotaExceeded)
async def quota(request,exc):return ORJSONResponse(err('AI_QUOTA_EXCEEDED','AI usage limit reached',request.state.request_id,exc.details()),429)
@app.exception_handler(HTTPException)
async def http_error(request,exc):return ORJSONResponse(err((exc.detail.get('code') if isinstance(exc.detail,dict) else None) or f'HTTP_{exc.status_code}',str(exc.detail.get('message') if isinstance(exc.detail,dict) else exc.detail),request.state.request_id,exc.detail if isinstance(exc.detail,dict) else {}),exc.status_code,headers=exc.headers)
@app.exception_handler(RequestValidationError)
async def validation(request,exc):return ORJSONResponse(err('VALIDATION_ERROR','Check submitted fields',request.state.request_id,{'fields':exc.errors()}),422)
@app.exception_handler(Exception)
async def unexpected(request,exc):return ORJSONResponse(err('INTERNAL_ERROR','Unexpected error',request.state.request_id),500)
@app.get('/live')
async def live():return {'status':'live','version':'3.0.0'}
async def checks(deep=False):
 out={};ok=True
 try:
  async with engine.connect() as connection:await asyncio.wait_for(connection.execute(text('SELECT 1')),5)
  out['database']='ok'
 except Exception as exc:out['database']=type(exc).__name__;ok=False
 try:
  redis=Redis.from_url(s.redis_url);await asyncio.wait_for(redis.ping(),3);out['redis']='ok'
  if deep:out['worker']='ok' if await redis.get(s.worker_heartbeat_key) else 'stale';ok=ok and out['worker']=='ok'
  await redis.aclose()
 except Exception as exc:out['redis']=type(exc).__name__;ok=False
 if deep:
  try:out['storage']=await asyncio.to_thread(get_storage().health) if hasattr(get_storage(),'health') else {'backend':s.storage_backend}
  except Exception as exc:out['storage']={'error':type(exc).__name__};ok=False
  out['ai']={'provider':s.ai_provider,'configured':s.ai_provider!='development' or not s.is_production};out['embeddings']={'provider':s.embedding_provider,'configured':s.embedding_provider!='development' or not s.is_production}
 return ok,out
@app.get('/ready')
async def ready():
 ok,result=await checks();return ORJSONResponse({'status':'ready' if ok else 'not_ready','checks':result},200 if ok else 503)
@app.get('/health/deep')
async def deep():
 ok,result=await checks(True);return ORJSONResponse({'status':'healthy' if ok else 'degraded','checks':result},200 if ok else 503)
@app.get('/health')
async def health():return await live()
@app.get('/metrics')
async def metrics():return Response(generate_latest(),media_type=CONTENT_TYPE_LATEST)
app.include_router(api_router,prefix=s.api_v1_prefix)
