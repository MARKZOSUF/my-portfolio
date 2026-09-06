import asyncio,math,time,uuid
from dataclasses import dataclass
from datetime import datetime,timezone
from sqlalchemy import func,select,text
from app.ai.models.base import ModelMessage
from app.database.models import AIUsage
from app.config.settings import get_settings
@dataclass
class AIQuotaExceeded(Exception):
 period:str;limit:float;used:float
 def details(self):return {'period':self.period,'limit':self.limit,'used':self.used,'remaining':max(0,self.limit-self.used)}
def estimate(value):
 text_value=value if isinstance(value,str) else '\n'.join(x.content for x in value);return max(1,math.ceil(len(text_value)/4))
async def reserve(db,user,provider,model,task,feature,request,budget):
 s=get_settings();now=datetime.now(timezone.utc);day=now.replace(hour=0,minute=0,second=0,microsecond=0);month=day.replace(day=1);await db.execute(text('SELECT pg_advisory_xact_lock(hashtext(:k))'),{'k':f'ai:{user}'})
 async def totals(start):
  row=(await db.execute(select(func.coalesce(func.sum(AIUsage.total_tokens+AIUsage.reserved_tokens),0),func.count(AIUsage.id),func.coalesce(func.sum(AIUsage.estimated_cost),0)).where(AIUsage.user_id==user,AIUsage.created_at>=start,AIUsage.status.in_(['reserved','completed'])))).one();return int(row[0]),int(row[1]),float(row[2])
 daily,requests,_=await totals(day);monthly,_,cost=await totals(month)
 for period,limit,used,addition in [('daily',s.ai_daily_token_limit,daily,budget),('monthly',s.ai_monthly_token_limit,monthly,budget),('daily_requests',s.ai_daily_request_limit,requests,1),('monthly_cost',s.ai_monthly_cost_limit,cost,0)]:
  if limit and used+addition>limit:raise AIQuotaExceeded(period,float(limit),float(used))
 row=AIUsage(user_id=user,provider=provider,model=model,task=task,feature=feature,request_id=request,input_tokens=0,output_tokens=0,total_tokens=0,reserved_tokens=budget,estimated_cost=0,latency_ms=0,status='reserved',usage_source='estimated');db.add(row);await db.commit();await db.refresh(row);return row

async def finalize(db,row,status,result=None,messages=None,error=None,started=0):
 row=await db.get(AIUsage,row.id);usage=(result.usage if result else {}) or {};row.input_tokens=int(usage.get('prompt_tokens') or usage.get('input_tokens') or estimate(messages or ''));row.output_tokens=int(usage.get('completion_tokens') or usage.get('output_tokens') or estimate(result.text if result else ''));row.total_tokens=row.input_tokens+row.output_tokens;row.reserved_tokens=0;row.status=status;row.error_type=error;row.latency_ms=max(1,int((time.monotonic()-started)*1000));row.usage_source='provider' if usage else 'estimated';await db.commit();return row

class AIExecutor:
 async def generate(self,db,user,feature,messages,task=None,request_id=None,max_tokens=2500,json_mode=False,temperature=.2):
  from app.ai.models.router import ModelRouter
  s=get_settings();model=ModelRouter().for_task(task or feature);name=getattr(model,'model',s.ai_task_models.get(task or feature,s.ai_model));provider=getattr(model,'provider_name',s.ai_provider);row=await reserve(db,user,provider,name,task or feature,feature,request_id or str(uuid.uuid4()),estimate(messages)+max_tokens);started=time.monotonic()
  try:
   result=await model.generate(messages,max_tokens=max_tokens,json_mode=json_mode,temperature=temperature);usage=result.usage or {};inp=int(usage.get('prompt_tokens') or usage.get('input_tokens') or estimate(messages));out=int(usage.get('completion_tokens') or usage.get('output_tokens') or estimate(result.text));row=await db.get(AIUsage,row.id);row.input_tokens=inp;row.output_tokens=out;row.total_tokens=inp+out;row.reserved_tokens=0;row.estimated_cost=round(inp/1e6*s.ai_input_cost_per_million.get(name,0)+out/1e6*s.ai_output_cost_per_million.get(name,0),8);row.latency_ms=max(1,int((time.monotonic()-started)*1000));row.status='completed';row.usage_source='provider' if usage else 'estimated';await db.commit();return result
  except Exception as exc:
   row=await db.get(AIUsage,row.id);row.reserved_tokens=0;row.status='failed';row.error_type=type(exc).__name__;row.latency_ms=max(1,int((time.monotonic()-started)*1000));await db.commit();raise
