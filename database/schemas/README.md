# Database schema

SQLAlchemy models in `backend/app/database/models.py` are canonical. Alembic migrations are reviewed and immutable after deployment. All user-owned records include an indexed `owner_id`; API authorization still checks ownership explicitly.
