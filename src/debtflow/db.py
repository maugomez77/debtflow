"""Async SQLAlchemy engine & session for Neon PostgreSQL."""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from .config import settings

_db_url = settings.DATABASE_URL
_is_postgres = "postgres" in _db_url
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)
if "?" in _db_url:
    _db_url = _db_url.split("?")[0]

_kw = {
    "echo": False,
    "pool_size": 3,
    "max_overflow": 5,
    "pool_pre_ping": True,
    "pool_recycle": 300,
    "connect_args": {"ssl": True, "timeout": 30} if _is_postgres else {},
}
engine = create_async_engine(_db_url, **_kw)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
