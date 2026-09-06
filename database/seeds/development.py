"""Idempotent development seed. Run only in a non-production environment."""
import asyncio
from sqlalchemy import select
from app.config.settings import get_settings
from app.database.models import Profile,User
from app.database.session import SessionLocal
from app.services.security import hash_password
async def main():
 if get_settings().is_production:raise SystemExit('Development seeds are disabled in production')
 async with SessionLocal() as db:
  email='learner@example.test';user=await db.scalar(select(User).where(User.email==email))
  if not user:user=User(email=email,display_name='Demo Learner',password_hash=hash_password('development-only-password'));db.add(user);await db.flush();db.add(Profile(user_id=user.id,subjects=['Physics','Mathematics']));await db.commit()
if __name__=='__main__':asyncio.run(main())
