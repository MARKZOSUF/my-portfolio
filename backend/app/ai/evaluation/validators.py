import re
from dataclasses import dataclass
@dataclass
class Evaluation:passed:bool;warnings:list[str];score:float
def evaluate_output(text:str,kind:str,evidence_count:int=0)->Evaluation:
 warnings=[]
 if len(text.strip())<80:warnings.append('Output is unusually short.')
 if re.search(r'guaranteed to (appear|be asked)',text,re.I):warnings.append('Removed guarantee language from an exam prediction.')
 if kind in {'research','pyq','exam_prediction'} and evidence_count==0:warnings.append('No verified source evidence was available; treat this as a study framework, not a factual analysis.')
 if re.search(r'https?://\S+',text) and evidence_count==0:warnings.append('Output included an unverified URL.')
 score=max(0.0,1-.2*len(warnings));return Evaluation(not warnings,warnings,score)
def numerical_sanity(text:str)->list[str]:
 issues=[]
 if 'Answer' in text and 'Unit' not in text:issues.append('Numerical answer may be missing a unit.')
 if 'Formula' in text and 'Substitution' not in text:issues.append('Formula was not followed by explicit substitution.')
 return issues
