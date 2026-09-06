"""Tutor conversation memory.

Keeps the most recent turns plus a running summary of what was dropped, so a long
tutoring session stays coherent without exceeding the context window.
"""
from __future__ import annotations
from dataclasses import dataclass,field
from datetime import datetime,timezone
from typing import Any,Literal

Role=Literal['user','assistant','system']
# ~4 characters per token is accurate enough for budgeting.
_CHARS_PER_TOKEN=4
DEFAULT_TOKEN_BUDGET=3000

def estimate_tokens(text:str)->int:
 return max(1,(len(text)+_CHARS_PER_TOKEN-1)//_CHARS_PER_TOKEN)

@dataclass(slots=True)
class Turn:
 role:Role
 content:str
 created_at:datetime=field(default_factory=lambda:datetime.now(timezone.utc))
 @property
 def tokens(self)->int:return estimate_tokens(self.content)
 def to_message(self)->dict[str,str]:return {'role':self.role,'content':self.content}

class ConversationMemory:
 """Rolling window with an evicted-turn summary."""
 def __init__(self,token_budget:int=DEFAULT_TOKEN_BUDGET,system_prompt:str|None=None)->None:
  self.token_budget=max(256,int(token_budget))
  self.system_prompt=system_prompt
  self._turns:list[Turn]=[]
  self._summary_points:list[str]=[]

 def add(self,role:Role,content:str)->None:
  text=content.strip()
  if not text:return
  self._turns.append(Turn(role=role,content=text))
  self._evict()

 def _evict(self)->None:
  """Drops oldest turns once over budget, folding them into the summary."""
  while len(self._turns)>2 and self.used_tokens>self.token_budget:
   dropped=self._turns.pop(0)
   snippet=dropped.content[:160].rstrip()
   self._summary_points.append(f'{dropped.role}: {snippet}')
   if len(self._summary_points)>20:self._summary_points.pop(0)

 @property
 def used_tokens(self)->int:
  base=estimate_tokens(self.system_prompt) if self.system_prompt else 0
  return base+estimate_tokens(self.summary)+sum(t.tokens for t in self._turns)

 @property
 def summary(self)->str:
  if not self._summary_points:return ''
  return 'Earlier in this session: '+' | '.join(self._summary_points)

 @property
 def turns(self)->list[Turn]:return list(self._turns)

 def messages(self)->list[dict[str,str]]:
  """Chat-completion message list, ready to send."""
  out:list[dict[str,str]]=[]
  if self.system_prompt:out.append({'role':'system','content':self.system_prompt})
  if self._summary_points:out.append({'role':'system','content':self.summary})
  out.extend(t.to_message() for t in self._turns)
  return out

 def clear(self)->None:
  self._turns.clear();self._summary_points.clear()

 def to_dict(self)->dict[str,Any]:
  return {'system_prompt':self.system_prompt,'summary':self.summary,'turns':[{'role':t.role,'content':t.content,'created_at':t.created_at.isoformat()} for t in self._turns],'used_tokens':self.used_tokens,'token_budget':self.token_budget}

 @classmethod
 def from_dict(cls,data:dict[str,Any])->'ConversationMemory':
  memory=cls(token_budget=int(data.get('token_budget',DEFAULT_TOKEN_BUDGET)),system_prompt=data.get('system_prompt'))
  for raw in data.get('turns',[]):
   role=raw.get('role')
   if role in ('user','assistant','system'):memory.add(role,str(raw.get('content','')))
  return memory
