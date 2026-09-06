from fastapi import APIRouter
from sqlalchemy import select
from app.api.deps import CurrentUser,DB
from app.database.models import Profile
from app.schemas.auth import ProfilePatch,UserOut
router=APIRouter(prefix='/users',tags=['users'])
@router.get('/me',response_model=UserOut)
async def me(user:CurrentUser):return UserOut(id=str(user.id),email=user.email,display_name=user.display_name)
@router.patch('/me/profile')
async def patch_profile(payload:ProfilePatch,user:CurrentUser,db:DB):
 profile=await db.scalar(select(Profile).where(Profile.user_id==user.id))
 if not profile:profile=Profile(user_id=user.id);db.add(profile)
 profile.subjects=payload.subjects;profile.learning_goal=payload.learning_goal;profile.daily_minutes=payload.daily_minutes;await db.commit();return {'saved':True}
