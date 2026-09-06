from dataclasses import dataclass
from datetime import date,timedelta
@dataclass(frozen=True)
class PlanInput:exam_date:date;topics:list[str];daily_minutes:int
def build_plan(data:PlanInput,today:date|None=None)->list[dict]:
 today=today or date.today();days=max(1,(data.exam_date-today).days);usable=max(1,days-2);tasks=[]
 for i in range(usable):
  topic=data.topics[i%max(1,len(data.topics))] if data.topics else 'Mixed revision';phase=i/usable;kind='learn' if phase<.5 else 'practice' if phase<.8 else 'revision';tasks.append({'date':today+timedelta(days=i),'topic':topic,'kind':kind,'minutes':data.daily_minutes})
 tasks.extend([{'date':data.exam_date-timedelta(days=2),'topic':'Mock test','kind':'mock','minutes':data.daily_minutes},{'date':data.exam_date-timedelta(days=1),'topic':'Light revision','kind':'revision','minutes':max(20,data.daily_minutes//2)}]);return tasks
