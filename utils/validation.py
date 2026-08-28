import re
from utils.errors import AppError
EMAIL_RE=re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
def require_json(request):
    if not request.is_json: raise AppError("JSON_REQUIRED","Expected a JSON request body.",415)
    data=request.get_json(silent=True)
    if not isinstance(data,dict): raise AppError("INVALID_JSON","Expected a JSON object.")
    return data
def validate_email(value):
    value=(value or "").strip().casefold()
    if len(value)>255 or not EMAIL_RE.fullmatch(value): raise AppError("INVALID_EMAIL","Enter a valid email address.")
    return value
def validate_password(value):
    if not isinstance(value,str) or len(value)<10 or len(value)>128 or not re.search(r"[A-Za-z]",value) or not re.search(r"\d",value):
        raise AppError("WEAK_PASSWORD","Password must be 10–128 characters and include a letter and number.")
    return value
def clean_text(value,max_len,field="text",preserve_lines=False):
    if not isinstance(value,str): raise AppError("MISSING_FIELD",f"{field.title()} is required.")
    value=value.strip()
    if not preserve_lines: value=" ".join(value.split())
    if not value: raise AppError("MISSING_FIELD",f"{field.title()} is required.")
    if len(value)>max_len: raise AppError("VALUE_TOO_LONG",f"{field.title()} is too long.")
    return value
def page_args(request,max_size=50):
    try: page=max(1,int(request.args.get("page",1))); size=min(max_size,max(1,int(request.args.get("page_size",20))))
    except ValueError: raise AppError("INVALID_PAGINATION","Pagination values must be integers.")
    return page,size
