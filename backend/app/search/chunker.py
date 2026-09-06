from dataclasses import dataclass
@dataclass(frozen=True)
class Chunk:index:int;text:str;start:int;end:int
def chunk_text(text:str,max_chars:int=3000,overlap:int=300)->list[Chunk]:
 if max_chars<=overlap or overlap<0:raise ValueError('max_chars must exceed overlap')
 clean='\n'.join(line.strip() for line in text.replace('\r','').splitlines() if line.strip());out=[];start=0
 while start<len(clean):
  end=min(len(clean),start+max_chars)
  if end<len(clean):
   pivot=max(clean.rfind('\n',start+max_chars//2,end),clean.rfind('. ',start+max_chars//2,end))
   if pivot>start:end=pivot+1
  part=clean[start:end].strip()
  if part:out.append(Chunk(len(out),part,start,end))
  if end>=len(clean):break
  start=max(start+1,end-overlap)
 return out
