from fastapi import APIRouter,Query
from sqlalchemy import or_,select
from app.api.deps import CurrentUser,DB
from app.database.models import Flashcard,Note,StudyPlan
from app.search.rag import retrieve
router=APIRouter(prefix='/search',tags=['search'])
@router.get('')
async def search(user:CurrentUser,db:DB,q:str=Query(min_length=2,max_length=300),mode:str='hybrid',limit:int=30):
 term=f'%{q}%';items=[]
 if mode in {'hybrid','keyword'}:
  for x in (await db.scalars(select(Note).where(Note.owner_id==user.id,or_(Note.title.ilike(term),Note.content.ilike(term))).limit(limit))).all():items.append({'id':str(x.id),'kind':'note','title':x.title,'snippet':x.content[:220],'score':.8})
  for x in (await db.scalars(select(Flashcard).where(Flashcard.owner_id==user.id,or_(Flashcard.front.ilike(term),Flashcard.back.ilike(term))).limit(limit))).all():items.append({'id':str(x.id),'kind':'flashcard','title':x.front[:120],'snippet':x.back[:220],'score':.65})
 if mode in {'hybrid','semantic'}:
  for x in await retrieve(db,user.id,q,limit=min(20,limit)):items.append({'id':x['source_id'],'kind':'source','title':x['title'],'snippet':x['content'][:220],'score':x['score']})
 seen=set();out=[]
 for x in sorted(items,key=lambda z:z['score'],reverse=True):
  k=(x['kind'],x['id'])
  if k not in seen:seen.add(k);out.append(x)
 return {'items':out[:min(limit,100)],'mode':mode}
