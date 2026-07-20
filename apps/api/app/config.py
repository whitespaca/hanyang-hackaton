from __future__ import annotations

from functools import cached_property
from ipaddress import ip_address
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parents[1]
ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=API_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: Literal["development", "test", "production"] = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    log_level: str = "INFO"
    inference_mode: Literal["mock", "model"] = "mock"
    model_path: Path = Path("./models/garbage_classifier.pt")
    model_metadata_path: Path = Path("./models/metadata.json")
    database_url: str = "sqlite:///./data/app.db"
    max_upload_bytes: int = Field(default=8 * 1024 * 1024, ge=1024)
    confidence_threshold: float = Field(default=0.65, ge=0, le=1)
    cors_origins: str = "http://localhost:3000,http://localhost:8081"
    guides_path: Path = ROOT_DIR / "data" / "disposal-guides.ko.json"
    spots_path: Path = ROOT_DIR / "data" / "collection-spots.ko.json"

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",") if origin.strip()]
        if not origins:
            raise ValueError("CORS_ORIGINS must contain at least one origin")
        for origin in origins:
            if origin == "*":
                continue
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.netloc
                or parsed.path
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError(f"Invalid CORS origin: {origin!r}")
        return ",".join(origins)

    @cached_property
    def cors_origin_list(self) -> list[str]:
        origins = self.cors_origins.split(",")
        if self.app_env == "production":
            for origin in origins:
                if origin == "*":
                    raise ValueError("Wildcard CORS is not allowed in production")
                parsed = urlsplit(origin)
                hostname = parsed.hostname or ""
                is_loopback = hostname.casefold() == "localhost"
                try:
                    loopback_ip = ip_address(hostname).is_loopback
                except ValueError:
                    loopback_ip = False
                is_loopback = is_loopback or loopback_ip
                if is_loopback:
                    raise ValueError("Loopback CORS origins are not allowed in production")
                if parsed.scheme != "https":
                    raise ValueError("Production CORS origins must use HTTPS")
        return origins

    def resolve_api_path(self, path: Path) -> Path:
        return path if path.is_absolute() else (API_DIR / path).resolve()

    def sqlite_path(self) -> Path:
        prefix = "sqlite:///"
        if not self.database_url.startswith(prefix):
            raise ValueError("Only sqlite:/// DATABASE_URL is supported in the MVP")
        raw_value = self.database_url.removeprefix(prefix)
        if raw_value == ":memory:":
            return Path(":memory:")
        raw_path = Path(raw_value)
        return self.resolve_api_path(raw_path)
