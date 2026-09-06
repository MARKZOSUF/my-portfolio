from datetime import datetime
from typing import Any
from pydantic import BaseModel,ConfigDict,Field

def camel(s:str)->str:
 parts=s.split('_');return parts[0]+''.join(x.title() for x in parts[1:])
class APIModel(BaseModel):
 model_config=ConfigDict(from_attributes=True,alias_generator=camel,populate_by_name=True)
class ErrorResponse(BaseModel):
 code:str;message:str;request_id:str|None=None;details:Any|None=None
class Page(APIModel):
 items:list[Any];next_cursor:str|None=None
class TaskResponse(APIModel):
 task_id:str;status:str;progress:float=0
