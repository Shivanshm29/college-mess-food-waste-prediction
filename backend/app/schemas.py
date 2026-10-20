from datetime import datetime, date
from typing import List, Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


# --- Auth Schemas ---


class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: Optional[str] = Field(None, max_length=100)
    role: Optional[Literal["manager", "admin", "staff", "student"]] = "manager"


class UserLogin(BaseModel):
    username_or_email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    role: str
    is_active: bool
    hostel_block: Optional[str] = None
    room_number: Optional[str] = None
    dietary_preference: Optional[str] = None
    reminder_cutoff_hours: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class MessageResponse(BaseModel):
    message: str


# --- Prediction Schemas ---

WeatherType = Literal["Clear", "Cloudy", "Hot", "Humid", "Rainy"]
MealType = Literal["Breakfast", "Lunch", "Snacks", "Dinner"]
SpecialMealType = Literal["Yes", "No"]


class PredictionCreate(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format", pattern=r"^\d{4}-\d{2}-\d{2}$")
    meal_type: MealType
    main_menu_items: str = Field(..., min_length=1, max_length=255)
    special_meal: SpecialMealType = "No"
    mess_capacity_students: int = Field(556, ge=1, le=5000)
    is_holiday: bool = False
    exam_on_day: bool = False
    college_event: bool = False
    weather_condition: WeatherType = "Clear"
    notes: Optional[str] = Field(None, max_length=500)

    # Optional overrides; auto-derived from date if omitted
    day_of_week: Optional[str] = None
    is_weekend: Optional[bool] = None

    @field_validator("main_menu_items")
    @classmethod
    def validate_menu(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Menu items cannot be blank")
        return stripped

    @field_validator("date")
    @classmethod
    def validate_date_format(cls, v: str) -> str:
        try:
            date.fromisoformat(v)
        except ValueError:
            raise ValueError("Date must be a valid calendar date in YYYY-MM-DD format")
        return v


class MenuRecommendation(BaseModel):
    menu_items: str
    short_label: str
    meal_type: str
    projected_students: float
    projected_food_required_kg: float
    projected_food_wastage_kg: float
    projected_waste_percentage: float
    student_delta: float
    student_delta_percentage: float
    wastage_delta_kg: float
    waste_percentage_delta: float
    strategy_badge: str
    reasoning: str
    score: float


class MenuRecommendationRequest(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format", pattern=r"^\d{4}-\d{2}-\d{2}$")
    meal_type: MealType
    main_menu_items: Optional[str] = None
    special_meal: SpecialMealType = "No"
    mess_capacity_students: int = Field(556, ge=1, le=5000)
    is_holiday: bool = False
    exam_on_day: bool = False
    college_event: bool = False
    weather_condition: WeatherType = "Clear"


class PredictionResponse(BaseModel):
    id: int
    user_id: int
    date: str
    day_of_week: str
    is_weekend: bool
    is_holiday: bool
    exam_on_day: bool
    college_event: bool
    weather_condition: str
    meal_type: str
    main_menu_items: str
    mess_capacity_students: int
    special_meal: str
    expected_students: float
    expected_food_required_kg: float
    expected_food_wastage_kg: float
    model_version: str
    notes: Optional[str] = None
    created_at: datetime

    # Calculated convenience metrics
    waste_percentage: Optional[float] = None
    food_per_student_kg: Optional[float] = None
    is_low_turnout: Optional[bool] = None
    turnout_percentage: Optional[float] = None
    menu_recommendations: Optional[List[MenuRecommendation]] = None

    model_config = ConfigDict(from_attributes=True)



class PaginatedPredictions(BaseModel):
    items: List[PredictionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Dashboard & Analytics Schemas ---


class MealWiseStat(BaseModel):
    meal_type: str
    count: int
    avg_expected_students: float
    avg_expected_food_kg: float
    avg_expected_wastage_kg: float
    avg_waste_percentage: float


class DashboardSummaryResponse(BaseModel):
    total_predictions: int
    avg_expected_students: float
    avg_expected_food_kg: float
    avg_expected_wastage_kg: float
    avg_waste_percentage: float
    recent_predictions: List[PredictionResponse]
    meal_wise_summary: List[MealWiseStat]
    has_history: bool


class TimelineDataPoint(BaseModel):
    date: str
    meal_type: str
    expected_students: float
    expected_food_required_kg: float
    expected_food_wastage_kg: float
    waste_percentage: float


class AnalyticsSummaryResponse(BaseModel):
    total_records: int
    total_expected_food_kg: float
    total_expected_wastage_kg: float
    overall_waste_percentage: float
    by_meal: List[MealWiseStat]
    timeline: List[TimelineDataPoint]
    has_history: bool


# --- Model Information Schemas ---


class TargetMetric(BaseModel):
    MAE: float
    RMSE: float
    R2: float
    actual_test_mean: Optional[float] = None
    predicted_test_mean: Optional[float] = None


class ModelInfoResponse(BaseModel):
    model_version: str
    algorithm: str
    dataset_name: str
    total_rows: int
    train_rows: int
    test_rows: int
    train_test_split_method: str
    features: List[str]
    categorical_features: List[str]
    numeric_features: List[str]
    targets: List[str]
    metrics: dict
    capacity_default: int
    limitations_disclaimer: str
    train_until_exclusive: Optional[str] = None
    hyperparameters: Optional[dict] = None
    domain_safeguards: Optional[List[dict]] = None
    feature_details: Optional[dict] = None


class ModelPreviewResponse(BaseModel):
    expected_students: float
    expected_food_required_kg: float
    expected_food_wastage_kg: float
    raw_expected_students: float
    raw_expected_food_required_kg: float
    raw_expected_food_wastage_kg: float
    waste_percentage: float
    food_per_student_kg: float
    safeguards_triggered: List[str]



# --- Health Schema ---


class HealthResponse(BaseModel):
    status: str
    database_connected: bool
    model_loaded: bool
    model_version: str
    version: str


# --- Student Portal Schemas ---

IntentionStatus = Literal["likely", "unlikely", "unsure"]


class MealIntentionCreate(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format", pattern=r"^\d{4}-\d{2}-\d{2}$")
    meal_type: MealType
    status: IntentionStatus
    notes: Optional[str] = Field(None, max_length=255)


class MealIntentionResponse(BaseModel):
    id: int
    user_id: int
    date: str
    meal_type: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MealFeedbackCreate(BaseModel):
    date: str = Field(..., description="Date in YYYY-MM-DD format", pattern=r"^\d{4}-\d{2}-\d{2}$")
    meal_type: MealType
    satisfaction_rating: int = Field(..., ge=1, le=5)
    taste_rating: int = Field(..., ge=1, le=5)
    portion_size_rating: Literal["Too small", "Just right", "Too large"]
    comments: Optional[str] = Field(None, max_length=500)
    is_anonymous: bool = False


class MealFeedbackResponse(BaseModel):
    id: int
    user_id: int
    date: str
    meal_type: str
    satisfaction_rating: int
    taste_rating: int
    portion_size_rating: str
    comments: Optional[str] = None
    is_anonymous: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentNotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    hostel_block: Optional[str] = Field(None, max_length=50)
    room_number: Optional[str] = Field(None, max_length=20)
    dietary_preference: Optional[Literal["Vegetarian", "Non-Vegetarian", "Jain"]] = "Vegetarian"
    reminder_cutoff_hours: Optional[int] = Field(1, ge=0, le=24)


class StudentMealItem(BaseModel):
    meal_type: str
    time_window: str
    cutoff_time: str
    cutoff_iso: Optional[str] = None
    is_closed: bool
    closure_reason: Optional[str] = None
    menu_items: str
    category: str
    current_intention: Optional[MealIntentionResponse] = None


class StudentDashboardResponse(BaseModel):
    today_date: str
    today_day_name: str
    student_name: str
    hostel_block: str
    room_number: str
    dietary_preference: str
    today_meals: List[StudentMealItem]
    upcoming_meals: List[dict]
    recent_intentions: List[MealIntentionResponse]
    announcements: List[StudentNotificationResponse]
    pending_responses_count: int

