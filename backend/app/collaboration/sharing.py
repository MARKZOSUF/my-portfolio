"""Permission rules for shared notes.

Share links are stored only as SHA-256 hashes (CollaborationPermission.
share_token_hash), so a database leak cannot be replayed to gain access.
"""
from __future__ import annotations
import hashlib
import secrets
from datetime import datetime,timezone
from typing import Any,Literal

Role=Literal['viewer','commenter','editor','owner']
ROLES:tuple[str,...]=('viewer','commenter','editor','owner')
_RANK={'viewer':0,'commenter':1,'editor':2,'owner':3}

# action -> minimum role required
_REQUIRED={'read':'viewer','comment':'commenter','edit':'editor','delete':'owner','share':'owner','revoke':'owner'}

def role_rank(role:str)->int:
 """Higher is more privileged. Unknown roles get the lowest rank."""
 return _RANK.get(role,-1)

def can(role:str,action:str)->bool:
 """True when `role` is permitted to perform `action`."""
 required=_REQUIRED.get(action)
 if required is None:return False
 return role_rank(role)>=_RANK[required]

def new_share_token(nbytes:int=32)->str:
 """Returns the plaintext token. Show it once, never store it."""
 return secrets.token_urlsafe(max(16,nbytes))

def hash_share_token(token:str)->str:
 """Stable 64-char hex digest, matching the String(64) column."""
 return hashlib.sha256(token.encode('utf-8')).hexdigest()

def verify_share_token(token:str,stored_hash:str)->bool:
 """Constant-time comparison to avoid leaking the hash byte by byte."""
 return secrets.compare_digest(hash_share_token(token),stored_hash or '')

def is_link_valid(permission:Any,at:datetime|None=None)->bool:
 """Checks revoked_at / expires_at on a CollaborationPermission row."""
 if permission is None:return False
 moment=at or datetime.now(timezone.utc)
 if getattr(permission,'revoked_at',None) is not None:return False
 expires=getattr(permission,'expires_at',None)
 if expires is not None and expires<=moment:return False
 return True

def describe(role:str)->str:
 """User-facing explanation shown on the share sheet."""
 return {'viewer':'Can read the note.','commenter':'Can read and leave comments.','editor':'Can read, comment and edit content.','owner':'Full control, including sharing and deletion.'}.get(role,'Unknown role.')
