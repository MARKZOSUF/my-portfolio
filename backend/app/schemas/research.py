from pydantic import BaseModel,Field
class ResearchRequest(BaseModel):query:str=Field(min_length=3,max_length=1000);student_level:str='undergraduate';language:str=Field(default='en',pattern='^(en|hi|hinglish)$');freshness_days:int|None=Field(default=None,ge=1,le=3650);max_sources:int=Field(default=12,ge=3,le=30)
