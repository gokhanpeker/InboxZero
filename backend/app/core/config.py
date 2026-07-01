"""Application configuration loaded from environment variables."""

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration — all values come from env or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "InboxZero"
    debug: bool = False

    database_url: str = Field(
        default="postgresql://inboxzero:inboxzero@localhost:5432/inboxzero",
        alias="DATABASE_URL",
    )
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    jwt_secret: str = Field(default="change-me", alias="JWT_SECRET")
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(default=1440, alias="JWT_EXPIRE_MINUTES")

    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")

    max_retry_attempts: int = Field(default=3, alias="MAX_RETRY_ATTEMPTS")
    max_batch_size: int = Field(default=50, alias="MAX_BATCH_SIZE")
    max_item_chars: int = Field(default=10000, alias="MAX_ITEM_CHARS")

    rate_limit_login: str = Field(default="5/minute", alias="RATE_LIMIT_LOGIN")
    rate_limit_submit: str = Field(default="10/hour", alias="RATE_LIMIT_SUBMIT")


settings = Settings()
