from fastapi import APIRouter,Request
from app.api.deps import CurrentUser,DB
from app.ai.models.base import ModelMessage
from app.ai.usage import AIExecutor
from app.schemas.learning import TutorIn,TutorOut
router=APIRouter(prefix='/tutor',tags=['tutor'])
@router.post('/chat',response_model=TutorOut)
async def chat(payload:TutorIn,request:Request,user:CurrentUser,db:DB):
 history=[ModelMessage(x.get('role','user'),x.get('content','')[:3000]) for x in payload.history[-8:]];result=await AIExecutor().generate(db,user.id,'tutor',[ModelMessage('system','You are a patient academic tutor. State uncertainty.'),*history,ModelMessage('user',payload.question)],task='tutor',request_id=request.state.request_id,max_tokens=2200);return {'answer':result.text,'citations':[],'uncertainty':None}
