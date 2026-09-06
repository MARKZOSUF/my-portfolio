import uuid
from typing import Annotated
from fastapi import Depends,HTTPException,status
from fastapi.security import HTTPAuthorizationCredentials,HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import User
from app.database.session import get_db
from app.services.security import decode_access_token
bearer=HTTPBearer(auto_error=False);DB=Annotated[AsyncSession,Depends(get_db)]
async def get_current_user(db:DB,cred:Annotated[HTTPAuthorizationCredentials|None,Depends(bearer)])->User:
 if not cred:raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail='Authentication required')
 try:user_id=decode_access_token(cred.credentials)
 except ValueError:raise HTTPException(status_code=401,detail='Invalid or expired token')
 user=await db.get(User,user_id)
 if not user or not user.is_active:raise HTTPException(status_code=401,detail='Account unavailable')
 return user
CurrentUser=Annotated[User,Depends(get_current_user)]
