import uuid
from datetime import datetime,timezone
from app.ai.evaluation.validators import evaluate_output
from app.ai.guardrails.input import sanitize_user_input
from app.ai.models.base import ModelMessage
from app.ai.orchestrator.sections import MODE_KEYS,STUDY_EVERYTHING
from app.ai.usage import AIExecutor
class StudyOrchestrator:
 async def build(self,db,user_id,topic,mode,context=None,request_id=None):
  topic=sanitize_user_input(topic);source='\n\n'.join(x.get('content','') for x in (context or []))[:18000];sections=[];warnings=[]
  for spec in STUDY_EVERYTHING:
   if spec.key not in set(MODE_KEYS[mode]):continue
   prompt=f'TOPIC: {topic}\nSECTION: {spec.title}\nTASK: {spec.instruction}\nCONTEXT:\n{source or "[none]"}\nDo not invent citations, statistics, PYQs, or guarantees.';result=await AIExecutor().generate(db,user_id,f'study.{spec.key}',[ModelMessage('system','You are a careful academic assistant.'),ModelMessage('user',prompt)],task='study',request_id=f'{request_id or uuid.uuid4()}:{spec.key}',max_tokens=1800);ok=result.text.strip()!='NOT_APPLICABLE';ev=evaluate_output(result.text,spec.key,len(context or [])) if ok else None;warnings.extend(ev.warnings if ev else []);sections.append({'key':spec.key,'title':spec.title,'applicable':ok,'markdown':result.text if ok else '','confidence':ev.score if ev else None,'citations':[]})
  return {'id':str(uuid.uuid4()),'topic':topic,'mode':mode,'sections':sections,'warnings':list(dict.fromkeys(warnings)),'created_at':datetime.now(timezone.utc)}
