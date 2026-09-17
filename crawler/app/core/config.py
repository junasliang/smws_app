from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SMWS API"
    app_env: str = "development"
    database_url: str = "sqlite:///./data/smws.db"

    smws_base_url: str = "https://www.smws.com.tw"
    smws_list_path: str = "/product/list/6"
    smws_page_size: int = 64
    smws_timeout_seconds: float = 20.0
    smws_request_delay_seconds: float = 0.25

    # OCR
    ocr_device: str = "cpu"
    ocr_max_image_bytes: int = 5_000_000
    ocr_max_image_side: int = 1600
    ocr_min_score: float = 0.35

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
