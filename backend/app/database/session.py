from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession,async_sessionmaker,create_async_engine
from app.config.settings import get_settings
settings=get_settings(); engine=create_async_engine(settings.database_url,pool_pre_ping=True,pool_size=settings.database_pool_size,max_overflow=settings.database_max_overflow,pool_timeout=settings.database_pool_timeout,pool_recycle=settings.database_pool_recycle)
SessionLocal=async_sessionmaker(engine,expire_on_commit=False,class_=AsyncSession)
async def get_db()->AsyncIterator[AsyncSession]:
 async with SessionLocal() as session:
  try: yield session
  except Exception: await session.rollback(); raise
