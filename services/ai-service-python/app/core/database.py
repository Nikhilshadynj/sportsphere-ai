# app/core/database.py
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

# PostgreSQL connection URL
DATABASE_URL = "postgresql+asyncpg://postgres:supersecretpassword@localhost:5432/sportsphere_ai"

# Engine is the connection pool manager
engine = create_async_engine(DATABASE_URL, echo=False)

# Session factory for handling requests
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Base class for models
Base = declarative_base()

async def get_db():
    async with SessionLocal() as session:
        yield session