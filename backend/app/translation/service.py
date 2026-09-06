"""Language handling for generated study material.

The app offers English, Hindi and Hinglish. Technical terms must NOT be
translated - a student sitting an English-medium exam still needs "derivative",
not its Hindi gloss. `protect_terms` masks them before any machine translation
and `restore_terms` puts them back afterwards.
"""
from __future__ import annotations
import re
from typing import Literal

Language=Literal['English','Hindi','Hinglish']
SUPPORTED_LANGUAGES:tuple[str,...]=('English','Hindi','Hinglish')

_ALIASES={'english':'English','en':'English','eng':'English','hindi':'Hindi','hi':'Hindi','\u0939\u093f\u0928\u094d\u0926\u0940':'Hindi','hinglish':'Hinglish','hi-en':'Hinglish','hien':'Hinglish'}

# Terms that stay verbatim in every language.
PROTECTED_TERMS=('pH','SI','DNA','RNA','ATP','pKa','Newton','Ohm','Faraday','Avogadro','Bernoulli','Doppler','Fourier','Laplace','Taylor','Maclaurin','Coulomb','Kelvin','Joule','Watt','Pascal','Hertz','Tesla','Weber','Henry','Mole','Enthalpy','Entropy','Gibbs')
_TOKEN='\u2e24{}\u2e25'

def normalize_language(value:str|None)->Language:
 """Maps loose user input to a supported language; defaults to English."""
 if not value:return 'English'
 return _ALIASES.get(value.strip().lower(),'English') if value.strip() not in SUPPORTED_LANGUAGES else value.strip()

def protect_terms(text:str,terms:tuple[str,...]=PROTECTED_TERMS)->tuple[str,dict[str,str]]:
 """Replaces protected terms with opaque tokens. Returns (masked, mapping)."""
 mapping:dict[str,str]={}
 masked=text
 for index,term in enumerate(terms):
  pattern=re.compile(rf'\b{re.escape(term)}\b')
  if not pattern.search(masked):continue
  token=_TOKEN.format(index)
  mapping[token]=term
  masked=pattern.sub(token,masked)
 # Preserve inline math and code spans too.
 for index,match in enumerate(re.findall(r'`[^`]+`|\$[^$]+\$',masked)):
  token=_TOKEN.format(f'm{index}')
  mapping[token]=match
  masked=masked.replace(match,token,1)
 return masked,mapping

def restore_terms(text:str,mapping:dict[str,str])->str:
 """Inverse of protect_terms."""
 out=text
 for token,original in mapping.items():out=out.replace(token,original)
 return out

def style_prompt(language:Language)->str:
 """Instruction fragment appended to generation prompts."""
 if language=='Hindi':return 'Write in Hindi (Devanagari). Keep technical terms and formulas in English.'
 if language=='Hinglish':return 'Write in Hinglish: Hindi sentence structure in Latin script, technical terms in English. Keep it natural, not literal.'
 return 'Write in clear exam-oriented English.'

def localize(text:str,language:str|None)->dict[str,str]:
 """Prepares text for translation without performing it.

 Returns the masked payload plus the style instruction, so the caller's model
 step is a single, cache-friendly request. English is a no-op passthrough.
 """
 target=normalize_language(language)
 if target=='English':return {'language':target,'text':text,'instruction':style_prompt(target)}
 masked,mapping=protect_terms(text)
 return {'language':target,'text':masked,'instruction':style_prompt(target),'protected':'|'.join(f'{k}={v}' for k,v in mapping.items())}
