from datetime import datetime
from pydantic import Field
from app.schemas.common import APIModel
class GenerateFeatureIn(APIModel):input:str=Field(min_length=2,max_length=10_000);source_ids:list[str]=Field(default_factory=list,max_length=30)
class FeatureSection(APIModel):title:str;content:str;uncertainty:str|None=None
class FeatureOut(APIModel):sections:list[FeatureSection];evidence:list[dict[str,str]]=Field(default_factory=list)
class QuizGenerateIn(APIModel):topic:str=Field(min_length=2,max_length=300);count:int=Field(default=10,ge=1,le=50);mix:bool=True
class QuestionOut(APIModel):id:str;type:str;prompt:str;options:list[str]|None=None;answer:str;explanation:str;difficulty:str;topic:str
class QuizOut(APIModel):questions:list[QuestionOut]
class QuizAttemptIn(APIModel):topic:str;score:int=Field(ge=0);total:int=Field(gt=0);duration_seconds:int|None=Field(default=None,ge=0);answers:list[dict]=Field(default_factory=list)
class FlashcardGenerateIn(APIModel):topic:str=Field(min_length=2,max_length=300);count:int=Field(default=12,ge=1,le=60)
class FlashcardOut(APIModel):id:str;front:str;back:str;due_at:datetime;interval_days:int;ease:float;bookmarked:bool
class FlashcardsOut(APIModel):cards:list[FlashcardOut]
class ReviewIn(APIModel):quality:int=Field(ge=1,le=5)
class TutorIn(APIModel):question:str=Field(min_length=2,max_length=5000);mode:str='Beginner';context_id:str|None=None;history:list[dict[str,str]]=Field(default_factory=list,max_length=20)
class TutorOut(APIModel):answer:str;citations:list[dict[str,str]]=Field(default_factory=list);uncertainty:str|None=None
