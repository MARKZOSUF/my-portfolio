"""Reusable StudyArtifact router factory.

definitions / derivations / formulas / numericals (and the generative half of
questions) are all the same shape: generate a study package for a topic, persist
it as a StudyArtifact row tagged with `kind`, then list / fetch / delete it.
This module implements that once so each routes.py stays a thin declaration.
"""
import uuid
from datetime import datetime
from typing import Any
from fastapi import APIRouter,HTTPException,Query,Request
from pydantic import Field
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.ai.orchestrator.service import StudyOrchestrator
from app.database.models import StudyArtifact
from app.schemas.common import APIModel
from app.search.rag import retrieve

ARTIFACT_KINDS=('definitions','derivations','formulas','numericals','questions','pyq','memory','revision')

class ArtifactGenerateIn(APIModel):
 topic:str=Field(min_length=3,max_length=220)
 mode:str='detailed_notes'
 source_ids:list[uuid.UUID]=[]

class ArtifactOut(APIModel):
 id:str;kind:str;topic:str;title:str;content:dict[str,Any];evidence:list[dict[str,Any]];confidence:float|None;created_at:datetime

def serialize(a:StudyArtifact)->ArtifactOut:
 return ArtifactOut(id=str(a.id),kind=a.kind,topic=a.topic,title=a.title,content=a.content or {},evidence=a.evidence or [],confidence=a.confidence,created_at=a.created_at)

def _as_dict(package:Any)->dict[str,Any]:
 """StudyOrchestrator.build may return a pydantic model or a plain dict."""
 if hasattr(package,'model_dump'):return package.model_dump(mode='json')
 if isinstance(package,dict):return package
 return {'value':str(package)}

def _confidence(content:dict[str,Any])->float|None:
 scores=[s.get('confidence') for s in content.get('sections',[]) if isinstance(s,dict) and isinstance(s.get('confidence'),(int,float))]
 return round(sum(scores)/len(scores),4) if scores else None

def _evidence(content:dict[str,Any])->list[dict[str,Any]]:
 out:list[dict[str,Any]]=[]
 for section in content.get('sections',[]):
  if not isinstance(section,dict):continue
  for citation in section.get('citations') or []:
   if isinstance(citation,dict):out.append(citation)
 return out

async def persist_artifact(db:DB,owner_id:uuid.UUID,kind:str,topic:str,content:dict[str,Any],title:str|None=None)->StudyArtifact:
 artifact=StudyArtifact(owner_id=owner_id,kind=kind,topic=topic,title=title or f'{kind.title()} \u2014 {topic}'[:255],content=content,evidence=_evidence(content),confidence=_confidence(content))
 db.add(artifact);await db.commit();await db.refresh(artifact);return artifact

async def generate_artifact(request:Request,db:DB,owner_id:uuid.UUID,kind:str,payload:ArtifactGenerateIn)->StudyArtifact:
 context=await retrieve(db,owner_id,payload.topic,payload.source_ids) if payload.source_ids else []
 package=await StudyOrchestrator().build(db,owner_id,payload.topic,payload.mode,context,getattr(request.state,'request_id',None))
 return await persist_artifact(db,owner_id,kind,payload.topic,_as_dict(package))

def build_artifact_router(kind:str,prefix:str,tag:str,mode:str='detailed_notes')->APIRouter:
 """Creates the standard generate/list/get/delete router for one artifact kind."""
 if kind not in ARTIFACT_KINDS:raise ValueError(f'Unsupported artifact kind: {kind}')
 router=APIRouter(prefix=prefix,tags=[tag])

 @router.post('/generate',response_model=ArtifactOut,status_code=201)
 async def generate(payload:ArtifactGenerateIn,request:Request,user:CurrentUser,db:DB):
  data=payload.model_copy(update={'mode':payload.mode or mode})
  return serialize(await generate_artifact(request,db,user.id,kind,data))

 @router.get('')
 async def list_artifacts(user:CurrentUser,db:DB,topic:str|None=None,limit:int=Query(30,ge=1,le=100),cursor:str|None=None):
  stmt=select(StudyArtifact).where(StudyArtifact.owner_id==user.id,StudyArtifact.kind==kind).order_by(StudyArtifact.created_at.desc()).limit(limit)
  if topic:stmt=stmt.where(StudyArtifact.topic.ilike(f'%{topic}%'))
  if cursor:stmt=stmt.where(StudyArtifact.id<uuid.UUID(cursor))
  rows=(await db.scalars(stmt)).all()
  return {'items':[serialize(x) for x in rows],'next_cursor':str(rows[-1].id) if len(rows)==limit else None}

 @router.get('/{artifact_id}',response_model=ArtifactOut)
 async def get_artifact(artifact_id:uuid.UUID,user:CurrentUser,db:DB):
  a=await db.get(StudyArtifact,artifact_id)
  if not a or a.owner_id!=user.id or a.kind!=kind:raise HTTPException(404,f'{tag.title()} not found')
  return serialize(a)

 @router.delete('/{artifact_id}',status_code=204)
 async def delete_artifact(artifact_id:uuid.UUID,user:CurrentUser,db:DB):
  a=await db.get(StudyArtifact,artifact_id)
  if not a or a.owner_id!=user.id or a.kind!=kind:raise HTTPException(404,f'{tag.title()} not found')
  await db.delete(a);await db.commit()

 return router
