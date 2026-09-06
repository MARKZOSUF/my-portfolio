from pydantic import EmailStr,Field
from app.schemas.common import APIModel
class UserOut(APIModel):id:str;email:EmailStr;display_name:str;email_verified:bool=False
class SignupIn(APIModel):display_name:str=Field(min_length=2,max_length=120);email:EmailStr;password:str=Field(min_length=12,max_length=128);device_name:str='Mobile device'
class LoginIn(APIModel):email:EmailStr;password:str;device_name:str='Mobile device'
class RefreshIn(APIModel):refresh_token:str
class TokenPair(APIModel):access_token:str;refresh_token:str;token_type:str='bearer';expires_in:int;user:UserOut
class ForgotPasswordIn(APIModel):email:EmailStr
class ResetPasswordIn(APIModel):token:str;new_password:str=Field(min_length=12,max_length=128)
class LogoutIn(APIModel):refresh_token:str|None=None;all_devices:bool=False
class VerifyEmailIn(APIModel):token:str
class ProfilePatch(APIModel):subjects:list[str];learning_goal:str|None=None;daily_minutes:int=Field(ge=5,le=960);language:str=Field(pattern='^(en|hi|hinglish)$')
class GoogleAuthIn(APIModel):id_token:str=Field(min_length=20,max_length=8192);nonce:str|None=Field(default=None,max_length=512);device_name:str='Mobile device'
class AuthProvidersOut(APIModel):google:bool=False;apple:bool=False;password:bool=True
