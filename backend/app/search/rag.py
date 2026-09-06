import hashlib,math,re,time,uuid
from collections import Counter
from sqlalchemy import func,select
from app.database.models import Embedding,KnowledgeEdge,Source
from app.search.embedding_provider import get_embedding_provider
from app.services.metrics import RAG_LATENCY
def tokens(value):return re.findall(r'\w{2,}',value.lower())
def bm25(query,documents,k1=1.5,b=.75):
 terms=tokens(query);docs=[tokens(value) for value in documents];avg=sum(map(len,docs))/max(1,len(docs));df=Counter(term for doc in docs for term in set(doc));scores=[]
 for doc in docs:
  freq=Counter(doc);score=0
  for term in terms:
   if not freq[term]:continue
   idf=math.log(1+(len(docs)-df[term]+.5)/(df[term]+.5));score+=idf*(freq[term]*(k1+1))/(freq[term]+k1*(1-b+b*len(doc)/max(1,avg)))
  scores.append(score)
 maximum=max(scores,default=1) or 1;return [value/maximum for value in scores]
async def retrieve(db,owner_id,query,source_ids=None,limit=10,context_chars=18000):
 started=time.monotonic();provider=get_embedding_provider();vector=(await provider.embed([query]))[0];statement=select(Embedding,Source).join(Source,Source.id==Embedding.source_id).where(Embedding.owner_id==owner_id)
 if source_ids:
  try:statement=statement.where(Embedding.source_id.in_([uuid.UUID(value) for value in source_ids]))
  except ValueError:return []
 vector_rows=(await db.execute(statement.order_by(Embedding.embedding.cosine_distance(vector)).limit(limit*5))).all();rank=func.ts_rank_cd(func.to_tsvector('simple',Embedding.content),func.plainto_tsquery('simple',query));lexical_rows=(await db.execute(statement.add_columns(rank).where(func.to_tsvector('simple',Embedding.content).op('@@')(func.plainto_tsquery('simple',query))).order_by(rank.desc()).limit(limit*5))).all();candidates={}
 for index,(embedding,source) in enumerate(vector_rows):candidates[embedding.id]=[embedding,source,1/(60+index),0,0]
 for index,(embedding,source,rank_value) in enumerate(lexical_rows):candidates.setdefault(embedding.id,[embedding,source,0,0,0])[3]=1/(60+index)
 graph_sources=set()
 for term in set(tokens(query)):
  rows=(await db.scalars(select(KnowledgeEdge).where(KnowledgeEdge.owner_id==owner_id,KnowledgeEdge.provenance['label'].astext.ilike(f'%{term}%')).limit(30))).all();graph_sources.update(row.provenance.get('source_id') for row in rows)
 values=list(candidates.values());bm25_values=bm25(query,[item[0].content for item in values])
 for item,bm in zip(values,bm25_values):item[4]=bm
 ranked=[]
 for embedding,source,vector_rrf,lexical_rrf,bm in values:
  graph=.12 if str(source.id) in graph_sources else 0;authority=.08 if source.kind in {'syllabus','pyq','document'} else .03;quality=float(source.metadata_json.get('quality_score',.5))*.08;score=.32*vector_rrf*60+.22*lexical_rrf*60+.26*bm+graph+authority+quality;ranked.append((score,embedding,source))
 output=[];seen=set();used=0
 for score,embedding,source in sorted(ranked,key=lambda row:row[0],reverse=True):
  digest=embedding.metadata_json.get('content_hash') or hashlib.sha256(embedding.content.encode()).hexdigest()
  if digest in seen or used+len(embedding.content)>context_chars:continue
  seen.add(digest);used+=len(embedding.content);output.append({'content':embedding.content,'source_id':str(source.id),'chunk_id':str(embedding.id),'title':source.title,'uri':source.uri or '','score':round(score,6),'page_number':embedding.metadata_json.get('page_number'),'section':embedding.metadata_json.get('section'),'timestamp':embedding.metadata_json.get('timestamp'),'embedding_provider':embedding.provider,'embedding_model':embedding.model,'citation_label':f'C{len(output)+1}'})
  if len(output)>=limit:break
 RAG_LATENCY.observe(time.monotonic()-started);return output
def context(items):return '\n\n'.join(f'<untrusted_evidence citation="{item["citation_label"]}" source="{item["source_id"]}">{item["content"]}</untrusted_evidence>' for item in items)
