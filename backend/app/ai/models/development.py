from collections.abc import AsyncIterator
from app.ai.models.base import LanguageModel,ModelMessage,ModelResult
class DevelopmentModel(LanguageModel):
 """Offline structural fallback for local UI/API development; never represented as production AI."""
 async def generate(self,messages:list[ModelMessage],*,temperature:float=.2,max_tokens:int=2500,json_mode:bool=False)->ModelResult:
  request=messages[-1].content if messages else 'Study request'
  topic=request.split('TOPIC:',1)[-1].splitlines()[0].strip()[:180] if 'TOPIC:' in request else 'the topic'
  text=(f'Use this section as a structured workspace for **{topic}**. Connect a configured AI provider and add trusted course sources for evidence-aware academic content.\n\n'
        '- Learning objective: define what the learner should be able to explain or solve.\n'
        '- Active recall: write the key idea from memory, then compare with an approved source.\n'
        '- Checkpoint: identify one assumption, one application, and one common mistake.\n\n'
        'This development fallback intentionally does not invent formulas, citations, PYQs, or predictions.')
  return ModelResult(text=text,model='development-structural-fallback',provider='development')
 async def stream(self,messages:list[ModelMessage],*,temperature:float=.2,max_tokens:int=2500)->AsyncIterator[str]:
  out=await self.generate(messages,temperature=temperature,max_tokens=max_tokens)
  for token in out.text.split(' '):yield token+' '
