from dataclasses import dataclass
import hashlib
@dataclass
class Chunk:index:int;text:str;metadata:dict
def chunks(doc,max_chars=2800,overlap=240):
 out=[];buf=[];metas=[];size=0
 def flush():
  nonlocal buf,metas,size
  if not buf:return
  text='\n\n'.join(buf);first,last=metas[0],metas[-1];out.append(Chunk(len(out),text,{'content_hash':hashlib.sha256(text.encode()).hexdigest(),'page_number':first.page,'slide_number':first.slide,'section':first.section or last.section,'paragraph_start':first.paragraph,'paragraph_end':last.paragraph,'language':doc.metadata.get('language')}));tail=text[-overlap:];buf=[tail];metas=[last];size=len(tail)
 for u in doc.units:
  if size+len(u.text)>max_chars and buf:flush()
  buf.append(u.text);metas.append(u);size+=len(u.text)+2
 flush();return out
