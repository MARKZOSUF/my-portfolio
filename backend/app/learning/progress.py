import math
from datetime import datetime,timedelta,timezone
from sqlalchemy import select
from app.database.models import Progress,StudyActivity
async def record(db,owner,topic,correct,total=1,kind='quiz',mistake=None,minutes=0):
 row=await db.scalar(select(Progress).where(Progress.owner_id==owner,Progress.topic==topic).with_for_update())
 if not row:row=Progress(owner_id=owner,topic=topic);db.add(row);await db.flush()
 row.attempt_count+=total;row.correct_count+=correct;row.mistake_count+=total-correct;row.mastery=round((row.correct_count+1)/(row.attempt_count+2),4);row.confidence=round(min(1,math.log1p(row.attempt_count)/math.log(31)),4);row.study_minutes+=minutes;row.last_reviewed_at=datetime.now(timezone.utc);row.next_review_at=row.last_reviewed_at+timedelta(days=1 if row.mastery<.5 else 3 if row.mastery<.7 else 7);items=list(row.mistakes or [])
 if total-correct:items.append({'at':row.last_reviewed_at.isoformat(),'kind':kind,'summary':str(mistake or 'Incorrect response')[:200]})
 row.mistakes=items[-100:];db.add(StudyActivity(owner_id=owner,kind=kind,topic=topic,minutes=minutes,score=correct/max(1,total),metadata_json={'correct':correct,'total':total}));return row
