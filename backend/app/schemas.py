from datetime import datetime, date
from typing import Any, List, Literal, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from backend.app.config import settings
from backend.app.validation import (
    calculate_special_meal_target,
    validate_attendance,
    validate_food_quantity,
    validate_meal_date,
    validate_meal_type,
)


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
    mess_capacity_students: int = Field(settings.DEFAULT_MESS_CAPACITY, ge=1)
    is_holiday: bool = False
    exam_on_day: bool = False
    college_event: bool = False
    weather_condition: WeatherType = "Clear"
    notes: Optional[str] = Field(None, max_length=500)

    # Optional manual target or post-meal actuals
    attendance: Optional[int] = None
    actual_attendance: Optional[int] = None
    actual_food_prepared_kg: Optional[float] = None
    actual_food_wasted_kg: Optional[float] = None

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
        return validate_meal_date(v)

    @field_validator("mess_capacity_students")
    @classmethod
    def validate_capacity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Mess capacity must be a positive whole number.")
        if v > settings.DEFAULT_MESS_CAPACITY:
            raise ValueError(
                f"Configured mess capacity ({v}) cannot exceed maximum dining hall capacity of {settings.DEFAULT_MESS_CAPACITY} students."
            )
        return v

    @field_validator("attendance", "actual_attendance", mode="before")
    @classmethod
    def validate_att(cls, v: Any) -> Optional[int]:
        if v is None:
            return None
        return validate_attendance(v, max_capacity=settings.DEFAULT_MESS_CAPACITY)

    @field_validator("actual_food_prepared_kg", mode="before")
    @classmethod
    def validate_food_prep(cls, v: Any) -> Optional[float]:
        if v is None:
            return None
        return validate_food_quantity(v, field_name="Actual food prepared")

    @field_validator("actual_food_wasted_kg", mode="before")
    @classmethod
    def validate_food_waste(cls, v: Any) -> Optional[float]:
        if v is None:
            return None
        return validate_food_quantity(v, field_name="Actual food wasted")


class ActualOutcomeCreate(BaseModel):
    actual_attendance: int = Field(..., description="Actual student attendance (0 to 556)")
    actual_food_prepared_kg: float = Field(..., description="Actual food prepared in kilograms (kg)")
    actual_food_wasted_kg: float = Field(..., description="Actual food wasted in kilograms (kg)")

    @field_validator("actual_attendance", mode="before")
    @classmethod
    def check_attendance(cls, v: Any) -> int:
        return validate_attendance(v, max_capacity=settings.DEFAULT_MESS_CAPACITY, field_name="Actual attendance")

    @field_validator("actual_food_prepared_kg", mode="before")
    @classmethod
    def check_food_prep(cls, v: Any) -> float:
        return validate_food_quantity(v, field_name="Actual food prepared")

    @field_validator("actual_food_wasted_kg", mode="before")
    @classmethod
    def check_food_waste(cls, v: Any) -> float:
        return validate_food_quantity(v, field_name="Actual food wasted")


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
    mess_capacity_students: int = Field(settings.DEFAULT_MESS_CAPACITY, ge=1)
    is_holiday: bool = False
    exam_on_day: bool = False
    college_event: bool = False
    weather_condition: WeatherType = "Clear"

    @field_validator("mess_capacity_students")
    @classmethod
    def validate_capacity(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Mess capacity must be a positive whole number.")
        if v > settings.DEFAULT_MESS_CAPACITY:
            raise ValueError(
                f"Configured mess capacity ({v}) cannot exceed maximum dining hall capacity of {settings.DEFAULT_MESS_CAPACITY} students."
            )
        return v


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

    # Actual Recorded Outcomes (Post-meal measurements - clearly separated from predictions)
    actual_attendance: Optional[int] = None
    actual_food_prepared_kg: Optional[float] = None
    actual_food_wasted_kg: Optional[float] = None
    recorded_at: Optional[datetime] = None
    has_actuals: bool = False

    # Differences / Variances (Actual - Predicted)
    attendance_difference: Optional[float] = None
    food_difference_kg: Optional[float] = None
    waste_difference_kg: Optional[float] = None

    # Operational Rule Overlays (Clearly distinguished from ML prediction)
    special_meal_target: Optional[int] = None
    rule_target_students: Optional[int] = None
    rule_explanation: Optional[str] = None

    # Submitted Student Intentions Context (Decision-support for kitchen batch planning)
    intentions_likely_count: Optional[int] = None
    intentions_unlikely_count: Optional[int] = None
    intentions_total_submitted: Optional[int] = None
    intentions_summary_note: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)



class PaginatedPredictions(BaseModel):
    items: List[PredictionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class NextMealFeaturesResponse(BaseModel):
    date: str
    day_of_week: str
    is_tomorrow: bool
    meal_type: MealType
    main_menu_items: str
    special_meal: SpecialMealType
    mess_capacity_students: int
    is_holiday: bool
    exam_on_day: bool
    college_event: bool
    weather_condition: WeatherType
    notes: Optional[str] = None
    time_window: str
    label: str
    description: str


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

    @field_validator("date")
    @classmethod
    def check_date(cls, v: str) -> str:
        return validate_meal_date(v)

    @field_validator("meal_type")
    @classmethod
    def check_meal(cls, v: str) -> str:
        return validate_meal_type(v)


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


class MealIntentionAuditResponse(BaseModel):
    id: int
    user_id: int
    date: str
    meal_type: str
    status: str
    action: str
    notes: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Mess Manager Intention Monitoring Schemas ---


class MealIntentionCountItem(BaseModel):
    meal_type: str
    likely_count: int
    unlikely_count: int
    unsure_count: int
    total_submitted: int
    no_response_count: int
    turnout_percentage: float


class DateIntentionsSummaryResponse(BaseModel):
    date: str
    configured_capacity: int
    total_students_enrolled: int
    total_submitted_intentions: int
    total_unique_students: int
    meals: List[MealIntentionCountItem]


class ManagerMealIntentionDetail(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_username: str
    hostel_block: Optional[str] = None
    room_number: Optional[str] = None
    meal_date: str
    meal_type: str
    intention_status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedManagerIntentions(BaseModel):
    items: List[ManagerMealIntentionDetail]
    total: int
    page: int
    page_size: int
    total_pages: int


class IntentionStudentRosterItem(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_username: str
    hostel_block: Optional[str] = None
    room_number: Optional[str] = None
    meal_date: str
    meal_type: str
    intention_status: str  # 'likely', 'unlikely', 'unsure'
    notes: Optional[str] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DateMealRosterResponse(BaseModel):
    date: str
    meal_type: Optional[str] = None
    total_responded: int
    likely_count: int
    unlikely_count: int
    unsure_count: int
    students_likely: List[IntentionStudentRosterItem]
    students_unlikely: List[IntentionStudentRosterItem]
    students_unsure: List[IntentionStudentRosterItem]
    all_students: List[IntentionStudentRosterItem]



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
    is_special: bool = False
    special_notice: Optional[str] = None
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

