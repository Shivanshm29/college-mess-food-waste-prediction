from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from backend.app.config import settings
from backend.app.database import Base, engine
from backend.app.ml_service import ml_service
from backend.app.routers import analytics, auth, dashboard, intentions, model_info, predictions, student
from backend.app.schemas import HealthResponse


def ensure_sqlite_columns():
    """Safely add new columns to SQLite tables if they do not exist."""
    try:
        with engine.begin() as conn:
            # Users table
            result = conn.execute(text("PRAGMA table_info(users)"))
            user_cols = {row[1] for row in result.fetchall()}
            if user_cols:
                if "hostel_block" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN hostel_block VARCHAR(50) DEFAULT 'Block A'"))
                if "room_number" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN room_number VARCHAR(20)"))
                if "dietary_preference" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN dietary_preference VARCHAR(30) DEFAULT 'Vegetarian'"))
                if "reminder_cutoff_hours" not in user_cols:
                    conn.execute(text("ALTER TABLE users ADD COLUMN reminder_cutoff_hours INTEGER DEFAULT 2"))

            # Predictions table (Actual measurements)
            pred_result = conn.execute(text("PRAGMA table_info(predictions)"))
            pred_cols = {row[1] for row in pred_result.fetchall()}
            if pred_cols:
                if "actual_attendance" not in pred_cols:
                    conn.execute(text("ALTER TABLE predictions ADD COLUMN actual_attendance INTEGER"))
                if "actual_food_prepared_kg" not in pred_cols:
                    conn.execute(text("ALTER TABLE predictions ADD COLUMN actual_food_prepared_kg FLOAT"))
                if "actual_food_wasted_kg" not in pred_cols:
                    conn.execute(text("ALTER TABLE predictions ADD COLUMN actual_food_wasted_kg FLOAT"))
                if "recorded_at" not in pred_cols:
                    conn.execute(text("ALTER TABLE predictions ADD COLUMN recorded_at DATETIME"))

            # Meal intentions table check
            mi_result = conn.execute(text("PRAGMA table_info(meal_intentions)"))
            mi_cols = {row[1] for row in mi_result.fetchall()}
            if mi_cols and "notes" not in mi_cols:
                conn.execute(text("ALTER TABLE meal_intentions ADD COLUMN notes VARCHAR(255)"))
    except Exception as e:
        print(f"[Database] Column migration notice: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_columns()
    # Ensure ML model is loaded
    if not ml_service.is_loaded:
        ml_service.load_model()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Full-stack College Mess Planning & Food Waste Prediction API",
    lifespan=lifespan,
)

# CORS Middleware (Restricted to frontend development origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Check API server, database connectivity, and ML model status."""
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        db_ok = False

    if not ml_service.is_loaded:
        ml_service.load_model()

    return HealthResponse(
        status="healthy" if (db_ok and ml_service.is_loaded) else "degraded",
        database_connected=db_ok,
        model_loaded=ml_service.is_loaded,
        model_version=ml_service.model_version,
        version=settings.VERSION,
    )


# Mount routers under /api
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(predictions.router, prefix=settings.API_V1_STR)
app.include_router(dashboard.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(model_info.router, prefix=settings.API_V1_STR)
app.include_router(student.router, prefix=settings.API_V1_STR)
app.include_router(intentions.router, prefix=settings.API_V1_STR)



@app.get("/", include_in_schema=False)
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/api/health",
    }
