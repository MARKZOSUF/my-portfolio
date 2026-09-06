from dataclasses import dataclass
from datetime import datetime,timedelta,timezone
@dataclass(frozen=True)
class Schedule:interval_days:int;ease:float;repetitions:int;due_at:datetime
def schedule(interval:int,ease:float,repetitions:int,quality:int,now:datetime|None=None)->Schedule:
 if not 1<=quality<=5:raise ValueError('quality must be 1..5')
 now=now or datetime.now(timezone.utc)
 if quality<3:new_reps=0;new_interval=1
 else:new_reps=repetitions+1;new_interval=1 if new_reps==1 else 6 if new_reps==2 else max(1,round(interval*ease))
 new_ease=max(1.3,ease+(0.1-(5-quality)*(0.08+(5-quality)*0.02)))
 return Schedule(new_interval,new_ease,new_reps,now+timedelta(days=new_interval))
