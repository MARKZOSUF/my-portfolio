"""Text <-> speech preparation.

Generated notes are full of Markdown, LaTeX and symbols that a TTS engine reads
as noise. `speakable` converts them to words. `clean_transcript` does the reverse
job for voice questions coming from the device recogniser.
"""
from __future__ import annotations
import re

# Symbols a TTS voice cannot pronounce, mapped to spoken English.
SYMBOLS=((r'\\times','times'),(r'\\div','divided by'),(r'\\pm','plus or minus'),(r'\\approx','approximately'),(r'\\neq','not equal to'),(r'\\leq','less than or equal to'),(r'\\geq','greater than or equal to'),(r'\\infty','infinity'),(r'\\alpha','alpha'),(r'\\beta','beta'),(r'\\gamma','gamma'),(r'\\delta','delta'),(r'\\theta','theta'),(r'\\lambda','lambda'),(r'\\mu','mu'),(r'\\pi','pi'),(r'\\sigma','sigma'),(r'\\omega','omega'),(r'\\sqrt','square root of'),(r'\\sum','sum of'),(r'\\int','integral of'))
UNITS={'m/s':'metres per second','m/s^2':'metres per second squared','kg':'kilograms','N':'newtons','J':'joules','W':'watts','Hz':'hertz','K':'kelvin'}
_WORDS_PER_MINUTE=165

def speakable(markdown:str)->str:
 """Strips Markdown/LaTeX and expands symbols into pronounceable words."""
 text=markdown
 text=re.sub(r'```.*?```','. Code block omitted. ',text,flags=re.DOTALL)
 text=re.sub(r'!\[[^\]]*\]\([^)]*\)','',text)
 text=re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',text)
 text=re.sub(r'^#{1,6}\s*','',text,flags=re.MULTILINE)
 text=re.sub(r'^\s*[-*+]\s+','',text,flags=re.MULTILINE)
 text=re.sub(r'(\*\*|__|\*|_|`)','',text)
 for pattern,spoken in SYMBOLS:text=re.sub(pattern,f' {spoken} ',text)
 text=text.replace('$','').replace('\\','')
 text=re.sub(r'(\d+)\s*/\s*(\d+)',r'\1 over \2',text)
 text=re.sub(r'\^(\d+)',r' to the power \1',text)
 text=re.sub(r'=',' equals ',text)
 for unit,spoken in UNITS.items():text=re.sub(rf'(?<=\d)\s*{re.escape(unit)}\b',f' {spoken}',text)
 text=re.sub(r'[ \t]+',' ',text)
 text=re.sub(r'\n{2,}','\n',text)
 return text.strip()

def chunk_for_speech(text:str,max_chars:int=900)->list[str]:
 """Splits on sentence boundaries so each request stays under TTS limits."""
 if max_chars<120:max_chars=120
 sentences=re.split(r'(?<=[.!?])\s+',speakable(text))
 chunks:list[str]=[];current=''
 for sentence in sentences:
  if not sentence:continue
  if len(current)+len(sentence)+1<=max_chars:
   current=f'{current} {sentence}'.strip()
  else:
   if current:chunks.append(current)
   current=sentence[:max_chars] if len(sentence)>max_chars else sentence
 if current:chunks.append(current)
 return chunks

def estimate_duration_seconds(text:str)->int:
 """Rough playback length, used to show a progress bar before audio arrives."""
 words=len(speakable(text).split())
 return max(1,round(words/_WORDS_PER_MINUTE*60))

def clean_transcript(raw:str)->str:
 """Normalises device speech-recognition output into a usable question."""
 text=re.sub(r'\s+',' ',raw).strip()
 text=re.sub(r'\b(um+|uh+|erm+|hmm+)\b','',text,flags=re.IGNORECASE)
 text=re.sub(r'\b(\w+)( \1\b)+',r'\1',text,flags=re.IGNORECASE)
 text=re.sub(r'\s+([?.!,])',r'\1',text)
 text=re.sub(r'\s{2,}',' ',text).strip()
 if text and text[-1] not in '?.!':
  starters=('what','why','how','when','where','who','which','is','are','can','does','do','explain','define','derive','prove')
  text+='?' if text.split()[0].lower() in starters else '.'
 return text[:1].upper()+text[1:] if text else text
