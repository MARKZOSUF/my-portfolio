import json,uuid
from datetime import datetime,timezone
from pydantic import BaseModel,Field
from app.ai.models.base import ModelMessage
from app.ai.usage import AIExecutor
class Question(BaseModel):type:str;prompt:str=Field(min_length=2);options:list[str]|None=None;answer:str;explanation:str;difficulty:str;topic:str
class Quiz(BaseModel):questions:list[Question]
class Card(BaseModel):front:str;back:str
class Cards(BaseModel):cards:list[Card]
async def generate_quiz(db,user,topic,count,request_id=None):
 prompt=f'TOPIC: {topic}\nReturn JSON object with exactly {count} questions. Each requires type,prompt,options,answer,explanation,difficulty,topic.';result=await AIExecutor().generate(db,user,'quiz',[ModelMessage('system','Return strict valid assessment JSON. Never invent source claims.'),ModelMessage('user',prompt)],task='quiz',request_id=request_id,json_mode=True,max_tokens=4500);data=Quiz.model_validate_json(result.text)
 if len(data.questions)!=count:raise ValueError('AI returned the wrong number of questions')
 return [{'id':str(uuid.uuid4()),**x.model_dump()} for x in data.questions]
async def generate_flashcards(db,user,topic,count,request_id=None):
 prompt=f'TOPIC: {topic}\nReturn JSON object with exactly {count} atomic cards, each with front and back.';result=await AIExecutor().generate(db,user,'flashcards',[ModelMessage('system','Return strict valid flashcard JSON.'),ModelMessage('user',prompt)],task='flashcards',request_id=request_id,json_mode=True,max_tokens=3000);data=Cards.model_validate_json(result.text)
 if len(data.cards)!=count:raise ValueError('AI returned the wrong number of cards')
 return [{'id':str(uuid.uuid4()),**x.model_dump(),'due_at':datetime.now(timezone.utc),'interval_days':0,'ease':2.5,'bookmarked':False} for x in data.cards]
