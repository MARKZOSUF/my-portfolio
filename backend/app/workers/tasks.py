import asyncio,hashlib,re,uuid
from sqlalchemy import delete,select
from app.database.models import Document,Embedding,Source
from app.database.session import SessionLocal
from app.documents.extractors import extract
from app.jobs.service import cancelled,update
from app.search.embedding_provider import get_embedding_provider
from app.search.hierarchical import chunks
from app.services.storage import get_storage
from app.workers.celery_app import celery
async def document(doc_id,task_id):
 async with SessionLocal() as db:
  doc=await db.get(Document,uuid.UUID(doc_id));tid=uuid.UUID(task_id);doc.status='processing';await update(db,tid,'running',.05,'validating');await db.commit()
  try:
   with get_storage().open(doc.storage_key) as f:data=f.read()
   parsed=await extract(data,doc.mime_type);await update(db,tid,'running',.3,'extracted',{'units':len(parsed.units),'metadata':parsed.metadata});source=Source(owner_id=doc.owner_id,document_id=doc.id,kind='document',title=doc.name,content_hash=hashlib.sha256((' '.join(x.text for x in parsed.units)).encode()).hexdigest(),metadata_json=parsed.metadata);db.add(source);await db.flush();items=chunks(parsed);provider=get_embedding_provider()
   for start in range(0,len(items),64):
    if await cancelled(db,tid):await update(db,tid,'cancelled',1);await db.commit();return
    part=items[start:start+64];vectors=await provider.embed([x.text for x in part])
    for c,v in zip(part,vectors):db.add(Embedding(owner_id=doc.owner_id,source_id=source.id,chunk_index=c.index,content=c.text,token_count=max(1,len(c.text)//4),metadata_json={'title':doc.name,'document_id':str(doc.id),**c.metadata},embedding=v))
    await update(db,tid,'running',.35+.6*(start+len(part))/len(items),'embedding_progress',{'completed':start+len(part),'total':len(items)});await db.commit()
   doc.status='ready';doc.page_count=parsed.metadata.get('page_count');result={'document_id':doc_id,'source_id':str(source.id),'chunks':len(items)};await update(db,tid,'succeeded',1,'completed',result,result);await db.commit();return result
  except Exception as e:doc.status='failed';doc.error_code=type(e).__name__;await update(db,tid,'failed',1,'failed',{'error_code':type(e).__name__},error=type(e).__name__);await db.commit();raise
@celery.task(bind=True,max_retries=3,name='documents.process',retry_backoff=True,retry_jitter=True)
def process_document(self,doc_id,task_id):
 try:return asyncio.run(document(doc_id,task_id))
 except Exception as e:
  if self.request.retries<self.max_retries:raise self.retry(exc=e)
  raise
YOUTUBE=[re.compile(r'youtu\.be/([\w-]{11})'),re.compile(r'[?&]v=([\w-]{11})'),re.compile(r'/shorts/([\w-]{11})')]
def youtube_id(url):
 for p in YOUTUBE:
  if m:=p.search(url):return m.group(1)
 raise ValueError('Invalid YouTube URL')
async def youtube(url,user_id,task_id,languages):
 async with SessionLocal() as db:
  tid=uuid.UUID(task_id);await update(db,tid,'running',.1,'transcript');await db.commit();vid=youtube_id(url)
  try:
   from youtube_transcript_api import YouTubeTranscriptApi
   data=await asyncio.to_thread(YouTubeTranscriptApi().fetch,vid,languages=languages);segments=[{'text':x.text,'start':x.start,'duration':x.duration} for x in data]
   if not segments:raise ValueError('TRANSCRIPT_UNAVAILABLE')
   text=' '.join(x['text'] for x in segments);src=Source(owner_id=uuid.UUID(user_id),kind='youtube',title=f'YouTube {vid}',uri=f'https://www.youtube.com/watch?v={vid}',content_hash=hashlib.sha256(text.encode()).hexdigest(),metadata_json={'video_id':vid,'language':languages[0],'segments':segments});db.add(src);await db.flush();from app.documents.extractors import Extracted,Unit
   parsed=Extracted([Unit(x['text'],paragraph=i,kind='transcript') for i,x in enumerate(segments)],{'language':languages[0],'video_id':vid});items=chunks(parsed);vectors=await get_embedding_provider().embed([x.text for x in items])
   for c,v in zip(items,vectors):db.add(Embedding(owner_id=uuid.UUID(user_id),source_id=src.id,chunk_index=c.index,content=c.text,token_count=max(1,len(c.text)//4),metadata_json={'title':src.title,'uri':src.uri,**c.metadata},embedding=v))
   result={'source_id':str(src.id),'video_id':vid,'language':languages[0],'segments':len(segments)};await update(db,tid,'succeeded',1,'completed',result,result);await db.commit();return result
  except Exception as e:code='TRANSCRIPT_UNAVAILABLE' if 'Transcript' in type(e).__name__ or 'TRANSCRIPT_UNAVAILABLE' in str(e) else type(e).__name__;await update(db,tid,'failed',1,'failed',{'error_code':code},error=code);await db.commit();raise
@celery.task(bind=True,max_retries=2,name='youtube.process',retry_backoff=True)
def process_youtube(self,url,user_id,task_id,languages=None):return asyncio.run(youtube(url,user_id,task_id,languages or ['en']))
