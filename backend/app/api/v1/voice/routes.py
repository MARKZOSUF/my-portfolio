import httpx
from fastapi import APIRouter,File,HTTPException,UploadFile
from app.api.deps import CurrentUser
from app.ai.models.base import ModelMessage
from app.ai.models.router import ModelRouter
from app.config.settings import get_settings
router=APIRouter(prefix='/voice',tags=['voice'])
@router.post('/question')
async def voice_question(user:CurrentUser,audio:UploadFile=File(...)):
 s=get_settings();key=s.ai_api_key.get_secret_value()
 if s.ai_provider=='development' or not key:raise HTTPException(503,'Speech provider is not configured. Set server-side AI credentials.')
 content=await audio.read();
 if len(content)>20*1024*1024:raise HTTPException(413,'Audio is too large')
 async with httpx.AsyncClient(timeout=90) as client:
  r=await client.post(f'{s.ai_base_url.rstrip("/")}/audio/transcriptions',headers={'Authorization':f'Bearer {key}'},files={'file':(audio.filename or 'question.m4a',content,audio.content_type or 'audio/mp4')},data={'model':'whisper-1'});r.raise_for_status();transcript=r.json()['text']
 out=await ModelRouter().for_task('voice').generate([ModelMessage('system','You are a concise voice tutor.'),ModelMessage('user',transcript)],max_tokens=1200);return {'transcript':transcript,'answer':out.text}
