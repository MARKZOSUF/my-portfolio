"""Deterministic mnemonic builders.

These are pure functions: no model call, no I/O. The AI layer may rewrite the
resulting `device` text for fluency, but the structural work (acronyms, chunking,
peg words) is done here so results are reproducible and testable.
"""
from __future__ import annotations
import re
from dataclasses import dataclass,field,asdict
from typing import Any,Iterable

# Classic major-system peg words: 1..10. Stable order matters for recall.
PEG_WORDS=('tie','Noah','ma','rye','law','shoe','cow','ivy','bee','toes')
VOWELS='AEIOU'

@dataclass(slots=True)
class MemoryTrick:
 kind:str
 title:str
 device:str
 explanation:str
 items:list[str]=field(default_factory=list)
 def to_dict(self)->dict[str,Any]:return asdict(self)

def _clean(items:Iterable[str])->list[str]:
 out:list[str]=[]
 for raw in items:
  text=re.sub(r'\s+',' ',str(raw)).strip()
  if text:out.append(text)
 return out

def _initials(items:list[str])->str:
 return ''.join(item[0].upper() for item in items if item)

def acronym(items:Iterable[str])->MemoryTrick|None:
 """First letters joined; inserts lowercase vowels when the result is unsayable."""
 cleaned=_clean(items)
 if len(cleaned)<2:return None
 letters=_initials(cleaned)
 if not any(ch in VOWELS for ch in letters):
  spoken=''.join(ch+('a' if i%2==0 and i<len(letters)-1 else '') for i,ch in enumerate(letters))
 else:
  spoken=letters
 return MemoryTrick(kind='acronym',title=f'Acronym: {letters}',device=letters if letters==spoken else f'{letters} (say it "{spoken}")',explanation=' \u00b7 '.join(f'{item[0].upper()} = {item}' for item in cleaned),items=cleaned)

def acrostic(items:Iterable[str])->MemoryTrick|None:
 """Builds a sentence whose word initials match the item initials."""
 cleaned=_clean(items)
 if len(cleaned)<2:return None
 starters={'A':'Angry','B':'Big','C':'Clever','D':'Daring','E':'Eager','F':'Funny','G':'Giant','H':'Happy','I':'Icy','J':'Jolly','K':'Kind','L':'Lazy','M':'Mighty','N':'Noble','O':'Odd','P':'Proud','Q':'Quiet','R':'Rapid','S':'Silly','T':'Tiny','U':'Useful','V':'Vast','W':'Wise','X':'Xeroxed','Y':'Young','Z':'Zesty'}
 words=[starters.get(item[0].upper(),item[0].upper()+'-word') for item in cleaned]
 sentence=' '.join(words)+'.'
 return MemoryTrick(kind='acrostic',title='Acrostic sentence',device=sentence,explanation=' \u00b7 '.join(f'{w} \u2192 {item}' for w,item in zip(words,cleaned)),items=cleaned)

def chunk_items(items:Iterable[str],size:int=3)->MemoryTrick|None:
 """Groups a long list into recallable chunks (working memory holds ~3-4)."""
 cleaned=_clean(items)
 if len(cleaned)<=size:return None
 size=max(2,min(size,5))
 groups=[cleaned[i:i+size] for i in range(0,len(cleaned),size)]
 device=' | '.join(', '.join(g) for g in groups)
 return MemoryTrick(kind='chunking',title=f'{len(groups)} chunks of {size}',device=device,explanation=f'Learn each of the {len(groups)} groups as one unit, then link the groups in order.',items=cleaned)

def peg_story(items:Iterable[str])->MemoryTrick|None:
 """Links each item to a numbered peg word so order is recoverable."""
 cleaned=_clean(items)
 if len(cleaned)<2:return None
 usable=cleaned[:len(PEG_WORDS)]
 pairs=[f'{i+1} ({PEG_WORDS[i]}) \u2192 {item}' for i,item in enumerate(usable)]
 return MemoryTrick(kind='peg',title='Number-peg links',device='; '.join(pairs),explanation='Picture each peg word interacting with its item. To recall item 4, recall "rye".',items=usable)

def story(items:Iterable[str])->MemoryTrick|None:
 """Chains items into one absurd narrative; absurdity aids retention."""
 cleaned=_clean(items)
 if len(cleaned)<2:return None
 parts=[f'the {cleaned[0]}']
 for item in cleaned[1:]:parts.append(f'which crashes into the {item}')
 return MemoryTrick(kind='story',title='Linked story',device='Picture '+', '.join(parts)+'.',explanation='Each image triggers the next, so the chain replays in order.',items=cleaned)

def build_tricks(topic:str,items:Iterable[str])->list[MemoryTrick]:
 """Returns every mnemonic that applies to the given items, best-first."""
 cleaned=_clean(items)
 if not cleaned:return []
 candidates=[acronym(cleaned),acrostic(cleaned),peg_story(cleaned),story(cleaned),chunk_items(cleaned)]
 tricks=[t for t in candidates if t is not None]
 label=re.sub(r'\s+',' ',topic).strip()
 if label:
  for t in tricks:t.title=f'{t.title} \u2014 {label}'
 return tricks
