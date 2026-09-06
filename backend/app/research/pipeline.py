from dataclasses import dataclass
from typing import Protocol
@dataclass(frozen=True)
class SearchHit:title:str;url:str;snippet:str;score:float
class SearchProvider(Protocol):
 async def search(self,query:str,limit:int=8)->list[SearchHit]:...
class DisabledSearchProvider:
 async def search(self,query:str,limit:int=8)->list[SearchHit]:return []
class ResearchPipeline:
 def __init__(self,provider:SearchProvider):self.provider=provider
 async def gather(self,query:str)->dict:
  plan=[query,f'{query} primary sources',f'{query} limitations']
  hits=[]
  for q in plan:hits.extend(await self.provider.search(q,5))
  unique={h.url:h for h in sorted(hits,key=lambda x:x.score,reverse=True)}
  return {'plan':plan,'sources':list(unique.values())[:12],'warning':None if unique else 'No external search provider is configured; no web claims were generated.'}
