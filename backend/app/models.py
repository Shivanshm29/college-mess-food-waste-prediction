from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from backend.app.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(120), unique=True, index=True, nullable=False)
    full_name = Column(String(100), nullable=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(20), default="manager", nullable=False)  # manager, admin, staff, student
    is_active = Column(Boolean, default=True, nullable=False)
    hostel_block = Column(String(50), nullable=True, default="Hostel Block A")
    room_number = Column(String(20), nullable=True, default="204")
    dietary_preference = Column(String(50), nullable=True, default="Vegetarian")
    reminder_cutoff_hours = Column(Integer, nullable=True, default=1)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    predictions = relationship(
        "Prediction",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(Prediction.created_at)",
    )

    intentions = relationship(
        "MealIntention",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(MealIntention.created_at)",
    )

    feedbacks = relationship(
        "MealFeedback",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(MealFeedback.created_at)",
    )


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Inputs
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    day_of_week = Column(String(20), nullable=False)
    is_weekend = Column(Boolean, nullable=False, default=False)
    is_holiday = Column(Boolean, nullable=False, default=False)
    exam_on_day = Column(Boolean, nullable=False, default=False)
    college_event = Column(Boolean, nullable=False, default=False)
    weather_condition = Column(String(30), nullable=False)
    meal_type = Column(String(30), nullable=False, index=True)
    main_menu_items = Column(String(255), nullable=False)
    mess_capacity_students = Column(Integer, nullable=False, default=556)
    special_meal = Column(String(10), nullable=False, default="No")  # "Yes" / "No"

    # Outputs (Predicted / Forecast)
    expected_students = Column(Float, nullable=False)
    expected_food_required_kg = Column(Float, nullable=False)
    expected_food_wastage_kg = Column(Float, nullable=False)

    # Actual Recorded Outcomes (Post-meal measurements - clearly separated from predictions)
    actual_attendance = Column(Integer, nullable=True)
    actual_food_prepared_kg = Column(Float, nullable=True)
    actual_food_wasted_kg = Column(Float, nullable=True)
    recorded_at = Column(DateTime, nullable=True)

    # Metadata
    model_version = Column(String(20), nullable=False, default="1.0.0")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="predictions")


class MealIntention(Base):
    """Real student meal attendance intentions for kitchen batch planning."""
    __tablename__ = "meal_intentions"
    __table_args__ = (
        UniqueConstraint("user_id", "date", "meal_type", name="uq_user_date_meal_intention"),
    )

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    meal_type = Column(String(30), nullable=False, index=True)  # Breakfast, Lunch, Dinner, Snacks
    status = Column(String(20), nullable=False)  # likely, unlikely, unsure
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="intentions")


class MealIntentionAudit(Base):
    """Historical audit log of student intention submissions, updates, and withdrawals."""
    __tablename__ = "meal_intention_audits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    meal_type = Column(String(30), nullable=False, index=True)  # Breakfast, Lunch, Dinner, Snacks
    status = Column(String(20), nullable=False)  # likely, unlikely, unsure
    action = Column(String(20), nullable=False)  # CREATED, UPDATED, WITHDRAWN
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False, index=True)

    user = relationship("User")


class MealFeedback(Base):
    """Student feedback on meal quality, satisfaction, taste, and portion size."""
    __tablename__ = "meal_feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    meal_type = Column(String(30), nullable=False)  # Breakfast, Lunch, Dinner, Snacks
    satisfaction_rating = Column(Integer, nullable=False)  # 1 to 5
    taste_rating = Column(Integer, nullable=False)  # 1 to 5
    portion_size_rating = Column(String(30), nullable=False)  # Too small, Just right, Too large
    comments = Column(Text, nullable=True)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    user = relationship("User", back_populates="feedbacks")


class StudentNotification(Base):
    """Official mess notifications, menu change announcements, and response reminders."""
    __tablename__ = "student_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    title = Column(String(120), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(30), default="announcement", nullable=False)  # announcement, menu_change, reminder
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)

