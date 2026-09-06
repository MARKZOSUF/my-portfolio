import base64,json,time,uuid
import httpx
from pydantic import BaseModel,Field
from app.ai.models.base import ModelMessage,ModelResult
from app.ai.usage.service import estimate_tokens,finalize,reserve
from app.config.settings import get_settings
class VisionUnderstanding(BaseModel):
 content_type:str;summary:str;detected_text:list[str]=Field(default_factory=list);equations:list[str]=Field(default_factory=list);table_rows:list[list[str]]=Field(default_factory=list);diagram_elements:list[dict]=Field(default_factory=list);confidence:float=Field(ge=0,le=1);limitations:list[str]=Field(default_factory=list)
class VisionUnavailable(RuntimeError):pass
async def analyze(db,user_id,data,mime,request_id):
 settings=get_settings()
 if settings.vision_provider not in {'openai','openai-compatible'}:raise VisionUnavailable('Vision provider is not configured')
 key=settings.vision_api_key.get_secret_value() or settings.ai_api_key.get_secret_value()
 if not key or not settings.vision_model:raise VisionUnavailable('Vision credentials/model are not configured')
 messages=[ModelMessage('system','Return strict JSON describing educational image content without guessing illegible details.'),ModelMessage('user','Analyze the supplied image into text, equations, tables, and diagram elements.')];usage=await reserve(db,user_id,settings.vision_provider,settings.vision_model,'vision','documents.vision',request_id,estimate_tokens(messages)+2000);started=time.monotonic();result=None
 try:
  payload={'model':settings.vision_model,'messages':[{'role':'system','content':messages[0].content},{'role':'user','content':[{'type':'text','text':messages[1].content},{'type':'image_url','image_url':{'url':f'data:{mime};base64,{base64.b64encode(data).decode()}'}}]}],'response_format':{'type':'json_object'},'max_tokens':2000,'temperature':0}
  async with httpx.AsyncClient(timeout=90) as client:response=await client.post(f'{settings.ai_base_url.rstrip("/")}/chat/completions',headers={'Authorization':f'Bearer {key}','Content-Type':'application/json'},json=payload);response.raise_for_status();body=response.json()
  result=ModelResult(text=body['choices'][0]['message']['content'],model=body.get('model',settings.vision_model),provider=settings.vision_provider,usage=body.get('usage') or {});validated=VisionUnderstanding.model_validate_json(result.text);await finalize(db,usage,'completed',result,messages,started=started);return validated
 except Exception as exc:await finalize(db,usage,'failed',result,messages,error=type(exc).__name__,started=started);raise
