from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
WORKSPACE_DIR = BASE_DIR.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "College Mess Planning & Food Waste Prediction API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Security
    SECRET_KEY: str = "mess-planning-super-secure-dev-secret-key-change-in-production-2026-min32bytes"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR}/mess_planning.db"

    # ML Model & Metrics
    # Priority: models/ directory, workspace root, backend dir
    MODEL_PATH: str = str(
        WORKSPACE_DIR / "models" / "mess_prediction_model.joblib"
        if (WORKSPACE_DIR / "models" / "mess_prediction_model.joblib").exists()
        else (
            WORKSPACE_DIR / "mess_prediction_model.joblib"
            if (WORKSPACE_DIR / "mess_prediction_model.joblib").exists()
            else WORKSPACE_DIR / "models" / "mess_prediction_model.joblib"
        )
    )
    METRICS_PATH: str = str(
        WORKSPACE_DIR / "models" / "mess_model_metrics.json"
        if (WORKSPACE_DIR / "models" / "mess_model_metrics.json").exists()
        else (
            WORKSPACE_DIR / "mess_model_metrics.json"
            if (WORKSPACE_DIR / "mess_model_metrics.json").exists()
            else WORKSPACE_DIR / "models" / "mess_model_metrics.json"
        )
    )

    # Mess configuration
    DEFAULT_MESS_CAPACITY: int = 556

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
