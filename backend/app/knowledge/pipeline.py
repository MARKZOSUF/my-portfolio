import hashlib,re
from collections import Counter
from sqlalchemy.dialects.postgresql import insert
from app.database.models import KnowledgeEdge
STOP={'The','This','That','These','Those','There','What','When','Where','Which','About','Study','Figure','Table','Chapter','Section'}
def concepts(text_value,limit=40):
 phrases=re.findall(r'\b(?:[A-Z][a-zA-Z0-9-]{2,}(?:\s+[A-Z][a-zA-Z0-9-]{2,}){0,3})\b',text_value);counts=Counter(x.strip() for x in phrases if x.split()[0] not in STOP);return [name for name,_ in counts.most_common(limit)]
def concept_id(label):return hashlib.sha256(label.lower().encode()).hexdigest()[:32]
async def extract_graph(db,owner_id,source_id,chunks):
 labels=concepts('\n'.join(chunk.text for chunk in chunks));edges=[]
 for label in labels:
  edges.append({'owner_id':owner_id,'from_type':'source','from_id':str(source_id),'relation':'contains','to_type':'concept','to_id':concept_id(label),'weight':1,'provenance':{'source_id':str(source_id),'label':label,'extractor':'rule_v1'}})
 for left,right in zip(labels,labels[1:]):edges.append({'owner_id':owner_id,'from_type':'concept','from_id':concept_id(left),'relation':'related_to','to_type':'concept','to_id':concept_id(right),'weight':.55,'provenance':{'source_id':str(source_id),'from_label':left,'label':right,'extractor':'cooccurrence_v1'}})
 text_value=' '.join(chunk.text for chunk in chunks)
 for match in re.finditer(r'([A-Z][\w -]{2,60})\s+(causes|leads to|requires|depends on)\s+([A-Z][\w -]{2,60})',text_value):
  left,verb,right=(x.strip(' .,;:') for x in match.groups());relation='causes' if verb in {'causes','leads to'} else 'prerequisite';edges.append({'owner_id':owner_id,'from_type':'concept','from_id':concept_id(left),'relation':relation,'to_type':'concept','to_id':concept_id(right),'weight':.85,'provenance':{'source_id':str(source_id),'from_label':left,'label':right,'extractor':'relation_pattern_v1'}})
 if edges:
  statement=insert(KnowledgeEdge).values(edges).on_conflict_do_nothing(constraint='uq_knowledge_edge');await db.execute(statement)
 return len(edges)
