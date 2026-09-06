import asyncio,sys
from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import create_async_engine
from app.config.settings import get_settings
EXPECTED={'users':{'email','password_hash'},'documents':{'status','attempt','retry_at'},'ai_usage':{'task','total_tokens','reserved_tokens','latency_ms','status'},'account_security':{'failed_login_count','last_failed_login_at','locked_until'},'study_tasks':{'status','version','postponed_from'},'collaboration_permissions':{'revoked_at','consumed_at'},'job_events':{'sequence'}}
async def main():
 engine=create_async_engine(get_settings().database_url)
 async with engine.connect() as connection:
  def check(sync):
   inspector=inspect(sync);missing=[]
   for table,columns in EXPECTED.items():
    if not inspector.has_table(table):missing.append(f'table:{table}');continue
    actual={x['name'] for x in inspector.get_columns(table)};missing += [f'{table}.{x}' for x in columns-actual]
   return missing
  missing=await connection.run_sync(check)
 await engine.dispose()
 if missing:print('Missing schema:',*missing,sep='\n- ');return 1
 print('Schema verification passed');return 0
if __name__=='__main__':raise SystemExit(asyncio.run(main()))
