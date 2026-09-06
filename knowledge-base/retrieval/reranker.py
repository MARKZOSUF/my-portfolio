import re
from dataclasses import dataclass
@dataclass
class Candidate:id:str;text:str;vector_score:float;metadata:dict
def rerank(query:str,candidates:list[Candidate],limit:int=8)->list[Candidate]:
 terms=set(re.findall(r'[a-z0-9]+',query.lower()))
 def score(c:Candidate):
  words=set(re.findall(r'[a-z0-9]+',c.text.lower()));lex=len(terms&words)/max(1,len(terms));return .72*c.vector_score+.28*lex
 return sorted(candidates,key=score,reverse=True)[:limit]
