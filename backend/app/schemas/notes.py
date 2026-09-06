from datetime import datetime
from pydantic import Field
from app.schemas.common import APIModel
class NoteCreate(APIModel):
 title:str=Field(min_length=1,max_length=240);content:str=Field(min_length=1,max_length=2_000_000);subject:str|None=Field(default=None,max_length=180);topic:str|None=Field(default=None,max_length=220);source_package_id:str|None=None
class NotePatch(APIModel):title:str|None=Field(default=None,min_length=1,max_length=240);content:str|None=Field(default=None,min_length=1,max_length=2_000_000);subject:str|None=None;topic:str|None=None
class NoteOut(APIModel):
 id:str;title:str;content:str;subject:str|None=None;topic:str|None=None;created_at:datetime;updated_at:datetime
class GenerateNotesIn(APIModel):topic:str=Field(min_length=2,max_length=1000);mode:str=Field(pattern='^(quick_notes|detailed_notes|deep_research|exam_mode|study_everything)$');source_ids:list[str]=Field(default_factory=list,max_length=30)
class StudySection(APIModel):key:str;title:str;applicable:bool;markdown:str;confidence:float|None=None;citations:list[dict[str,str]]=Field(default_factory=list)
class StudyPackage(APIModel):id:str;topic:str;mode:str;sections:list[StudySection];warnings:list[str]=Field(default_factory=list);created_at:datetime
