import hashlib,math
from typing import Protocol
import httpx
from tenacity import retry,stop_after_attempt,wait_exponential
from app.config.settings import get_settings
class EmbeddingProvider(Protocol):
 async def embed(self,texts:list[str])->list[list[float]]:...
class DevelopmentEmbeddingProvider:
 """Deterministic vectors for development/tests; not a semantic production model."""
 def __init__(self,dimensions:int=1536):self.dimensions=dimensions
 async def embed(self,texts:list[str])->list[list[float]]:
  result=[]
  for text in texts:
   values=[0.0]*self.dimensions
   for token in text.lower().split():
    h=int(hashlib.sha256(token.encode()).hexdigest()[:16],16);values[h%self.dimensions]+=1 if h&1 else -1
   norm=math.sqrt(sum(v*v for v in values)) or 1;result.append([v/norm for v in values])
  return result
class OpenAIEmbeddingProvider:
 def __init__(self,base_url:str,key:str,model:str,dimensions:int):self.base=base_url.rstrip('/');self.key=key;self.model=model;self.dimensions=dimensions
 @retry(stop=stop_after_attempt(3),wait=wait_exponential(min=1,max=8),reraise=True)
 async def embed(self,texts:list[str])->list[list[float]]:
  payload={'model':self.model,'input':texts,'dimensions':self.dimensions}
  async with httpx.AsyncClient(timeout=90) as client:
   response=await client.post(f'{self.base}/embeddings',headers={'Authorization':f'Bearer {self.key}','Content-Type':'application/json'},json=payload);response.raise_for_status();data=response.json()
  ordered=sorted(data['data'],key=lambda x:x['index']);return [x['embedding'] for x in ordered]
def get_embedding_provider()->EmbeddingProvider:
 s=get_settings()
 if s.embedding_provider=='development':return DevelopmentEmbeddingProvider(s.embedding_dimensions)
 if s.embedding_provider in {'openai','openai-compatible'}:
  key=s.ai_api_key.get_secret_value()
  if not key:raise RuntimeError('AI_API_KEY is required for embeddings')
  return OpenAIEmbeddingProvider(s.ai_base_url,key,s.embedding_model,s.embedding_dimensions)
 raise RuntimeError(f'Unsupported embedding provider: {s.embedding_provider}')
