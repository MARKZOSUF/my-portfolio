import hashlib
from app.database.models import AuditEvent
def h(v):return hashlib.sha256(v.encode()).hexdigest() if v else None
async def audit(db,action,resource,actor=None,resource_id=None,request=None,metadata=None):
 safe={k:v for k,v in (metadata or {}).items() if k.lower() not in {'token','password','secret','content','authorization'}};db.add(AuditEvent(actor_id=actor,action=action,resource_type=resource,resource_id=resource_id,metadata_json={**safe,'ip_hash':h(request.client.host if request and request.client else None),'agent_hash':h(request.headers.get('user-agent') if request else None)}))
