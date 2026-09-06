import re
from youtube_transcript_api import YouTubeTranscriptApi
ID_PATTERNS=[re.compile(r'youtu\.be/([A-Za-z0-9_-]{11})'),re.compile(r'[?&]v=([A-Za-z0-9_-]{11})'),re.compile(r'/shorts/([A-Za-z0-9_-]{11})')]
def video_id(url:str)->str:
 for p in ID_PATTERNS:
  if m:=p.search(url):return m.group(1)
 raise ValueError('Invalid YouTube URL')
def fetch_transcript(url:str,languages:list[str]|None=None)->tuple[str,list[dict]]:
 vid=video_id(url);api=YouTubeTranscriptApi();items=api.fetch(vid,languages=languages or ['en']);segments=[{'text':x.text,'start':x.start,'duration':x.duration} for x in items];return ' '.join(x['text'] for x in segments),segments
