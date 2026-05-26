"""DebtFlow configuration via pydantic-settings."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/debtflow"
    GITHUB_TOKEN: str = ""
    HOURLY_RATE: float = 150.0
    DEFAULT_BRANCH: str = "main"
    CLONE_DIR: str = "/tmp/debtflow_clones"
    PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    DEBT_THRESHOLD_SEVERE: float = 50000.0
    DEBT_THRESHOLD_MODERATE: float = 10000.0


settings = Settings()
