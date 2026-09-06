import hashlib,time
from fastapi import Request
from redis.asyncio import Redis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.config.settings import get_settings
LUA="""local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end;return {n,redis.call('PTTL',KEYS[1])}"""
class RateLimitMiddleware(BaseHTTPMiddleware):
 def __init__(self,app):super().__init__(app);self.s=get_settings();self.redis=Redis.from_url(self.s.redis_url,decode_responses=True);self.script=self.redis.register_script(LUA)
 async def dispatch(self,request:Request,call_next):
  auth='/auth/' in request.url.path;limit=self.s.auth_rate_limit_per_minute if auth else self.s.rate_limit_per_minute;ip=request.client.host if request.client else 'unknown';key=hashlib.sha256(f'{ip}:{request.url.path}'.encode()).hexdigest();bucket=f'rl:{"auth" if auth else "api"}:{key}:{int(time.time()//60)}'
  try:count,ttl=await self.script(keys=[bucket],args=[61000])
  except Exception:
   if self.s.is_production and self.s.rate_limit_fail_closed:return JSONResponse({'success':False,'error':{'code':'RATE_LIMIT_UNAVAILABLE','message':'Request protection unavailable','details':{}},'request_id':getattr(request.state,'request_id',None)},503,headers={'Retry-After':'60'})
   return await call_next(request)
  if int(count)>limit:return JSONResponse({'success':False,'error':{'code':'RATE_LIMITED','message':'Too many requests','details':{'scope':'auth' if auth else 'api'}},'request_id':getattr(request.state,'request_id',None)},429,headers={'Retry-After':str(max(1,(int(ttl)+999)//1000))})
  return await call_next(request)
