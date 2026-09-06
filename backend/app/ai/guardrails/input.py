import re
MAX_INPUT=10_000
def sanitize_user_input(value:str)->str:
 value=value.strip()
 if not value or len(value)>MAX_INPUT:raise ValueError('Input length is invalid')
 value=re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]','',value)
 return value
