from fastapi import APIRouter,HTTPException,Request
from app.api.deps import CurrentUser,DB
from app.ai.generation.features import FeatureGenerator,INSTRUCTIONS
from app.schemas.learning import FeatureOut,GenerateFeatureIn
from app.search.rag import retrieve
router=APIRouter(prefix='/generate',tags=['generation'])
@router.post('/{kind}',response_model=FeatureOut)
async def generate(kind:str,payload:GenerateFeatureIn,request:Request,user:CurrentUser,db:DB):
 if kind not in INSTRUCTIONS:raise HTTPException(404,'Generator not found')
 context=await retrieve(db,user.id,payload.input,payload.source_ids) if payload.source_ids else []
 return await FeatureGenerator().run(db,user.id,kind,payload.input,context,request.state.request_id)
