from abc import ABC,abstractmethod
from dataclasses import dataclass,field
from typing import Iterable,Sequence
from utils.errors import AppError
@dataclass(frozen=True)
class ProviderCapabilities:
    generation:bool=True
    streaming:bool=False
    web_search:bool=False
    embeddings:bool=False
    def as_dict(self): return {"generation":self.generation,"streaming":self.streaming,"web_search":self.web_search,"embeddings":self.embeddings}
@dataclass
class SearchHit:
    title:str
    url:str
    snippet:str=""
    published_date:str|None=None
    source_type:str="web"
@dataclass
class AIResponse:
    text:str
    citations:list[SearchHit]=field(default_factory=list)
    usage:dict=field(default_factory=dict)
class AIProvider(ABC):
    provider_name="unknown"
    capabilities=ProviderCapabilities()
    @abstractmethod
    def generate(self,messages:Sequence[dict],*,max_tokens:int|None=None,temperature:float=0.2)->AIResponse: ...
    def stream(self,messages:Sequence[dict],*,max_tokens:int|None=None)->Iterable[str]:
        raise AppError("STREAMING_NOT_SUPPORTED","The configured provider does not support streaming.",422)
    def search_web(self,query:str,*,max_results:int=5)->list[SearchHit]:
        raise AppError("WEB_SEARCH_NOT_SUPPORTED","Live web research is not supported by the configured provider. Upload documents to use Document Study Mode.",422)
