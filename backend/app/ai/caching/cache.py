"""Cache for model responses.

Generation is the dominant cost in this app and students regenerate the same
topic repeatedly. `prompt_key` hashes every input that can change the output, so
identical requests hit the cache and differing ones never collide.
"""
from __future__ import annotations
import hashlib
import json
import threading
import time
from typing import Any

DEFAULT_TTL_SECONDS=60*60*6
DEFAULT_MAX_ENTRIES=512

def prompt_key(*,model:str,prompt:str,temperature:float=0.0,language:str='English',context:Any=None,version:str='1')->str:
 """Stable cache key. Any change to these inputs changes the key."""
 payload={'model':model,'prompt':prompt,'temperature':round(float(temperature),4),'language':language,'context':context,'version':version}
 blob=json.dumps(payload,sort_keys=True,default=str,ensure_ascii=False)
 return hashlib.sha256(blob.encode('utf-8')).hexdigest()

class ResponseCache:
 """Thread-safe TTL cache with LRU-ish eviction.

 Deliberately in-process: it is a hot-path guard, not a source of truth. Swap in
 Redis by giving the same get/set/invalidate surface.
 """
 def __init__(self,ttl_seconds:int=DEFAULT_TTL_SECONDS,max_entries:int=DEFAULT_MAX_ENTRIES)->None:
  self.ttl=max(1,int(ttl_seconds));self.max_entries=max(1,int(max_entries))
  self._store:dict[str,tuple[float,Any]]={};self._hits=0;self._misses=0
  self._lock=threading.RLock()

 def get(self,key:str)->Any|None:
  with self._lock:
   entry=self._store.get(key)
   if entry is None:
    self._misses+=1;return None
   expires_at,value=entry
   if expires_at<=time.monotonic():
    self._store.pop(key,None);self._misses+=1;return None
   # Refresh insertion order so hot keys survive eviction.
   self._store.pop(key);self._store[key]=(expires_at,value)
   self._hits+=1;return value

 def set(self,key:str,value:Any,ttl_seconds:int|None=None)->None:
  with self._lock:
   if len(self._store)>=self.max_entries and key not in self._store:
    self._store.pop(next(iter(self._store)),None)
   self._store[key]=(time.monotonic()+max(1,int(ttl_seconds or self.ttl)),value)

 def invalidate(self,key:str)->bool:
  with self._lock:return self._store.pop(key,None) is not None

 def clear(self)->None:
  with self._lock:self._store.clear();self._hits=0;self._misses=0

 def purge_expired(self)->int:
  now=time.monotonic()
  with self._lock:
   stale=[k for k,(exp,_) in self._store.items() if exp<=now]
   for k in stale:self._store.pop(k,None)
   return len(stale)

 @property
 def stats(self)->dict[str,Any]:
  with self._lock:
   total=self._hits+self._misses
   return {'entries':len(self._store),'hits':self._hits,'misses':self._misses,'hit_rate':round(self._hits/total,4) if total else 0.0}

response_cache=ResponseCache()
