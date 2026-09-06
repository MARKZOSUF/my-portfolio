import hashlib,math
from typing import Protocol
class EmbeddingProvider(Protocol):
 async def embed(self,texts:list[str])->list[list[float]]:...
class DevelopmentEmbeddingProvider:
 """Deterministic local vectors for tests/development only, not semantic production embeddings."""
 def __init__(self,dimensions:int=1536):self.dimensions=dimensions
 async def embed(self,texts:list[str])->list[list[float]]:
  result=[]
  for text in texts:
   values=[0.0]*self.dimensions
   for token in text.lower().split():
    h=int(hashlib.sha256(token.encode()).hexdigest()[:16],16);values[h%self.dimensions]+=1 if h&1 else -1
   norm=math.sqrt(sum(v*v for v in values)) or 1;result.append([v/norm for v in values])
  return result
