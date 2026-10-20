from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.ml_service import ml_service
from backend.app.models import (
    MealFeedback,
    MealIntention,
    Prediction,
    StudentNotification,
    User,
)
from backend.app.schemas import (
    MealFeedbackCreate,
    MealFeedbackResponse,
    MealIntentionCreate,
    MealIntentionResponse,
    StudentDashboardResponse,
    StudentMealItem,
    StudentNotificationResponse,
    StudentProfileUpdate,
    UserResponse,
)
from backend.app.security import get_current_user

router = APIRouter(prefix="/student", tags=["Student Portal"])

MEAL_CONFIG = {
    "Breakfast": {
        "time_window": "7:30 AM - 9:30 AM",
        "cutoff_hour": 6,
        "cutoff_minute": 30,
        "cutoff_time": "6:30 AM",
    },
    "Lunch": {
        "time_window": "12:30 PM - 2:30 PM",
        "cutoff_hour": 11,
        "cutoff_minute": 0,
        "cutoff_time": "11:00 AM",
    },
    "Dinner": {
        "time_window": "7:30 PM - 9:30 PM",
        "cutoff_hour": 18,
        "cutoff_minute": 0,
        "cutoff_time": "6:00 PM",
    },
}

DAYS_LIST = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def get_cutoff_status(meal_date_str: str, meal_type: str) -> tuple[bool, str, Optional[str], Optional[str]]:
    """
    Check whether the intention response cutoff for a given date and meal type has passed.
    Returns (is_closed, cutoff_time_str, closure_reason, cutoff_iso).
    """
    config = MEAL_CONFIG.get(meal_type, {
        "time_window": "12:00 PM - 2:00 PM",
        "cutoff_hour": 10,
        "cutoff_minute": 0,
        "cutoff_time": "10:00 AM",
    })

    cutoff_time_str = config["cutoff_time"]
    try:
        parsed_date = date.fromisoformat(meal_date_str)
    except ValueError:
        return True, cutoff_time_str, "Invalid date format", None

    today = date.today()
    cutoff_dt = datetime.combine(parsed_date, time(config["cutoff_hour"], config["cutoff_minute"]))
    cutoff_iso = cutoff_dt.isoformat()

    if parsed_date < today:
        return True, cutoff_time_str, "Service date has passed", cutoff_iso
    elif parsed_date > today:
        return False, cutoff_time_str, None, cutoff_iso
    else:
        # Today: compare current local time
        now_time = datetime.now().time()
        cutoff_time_obj = time(config["cutoff_hour"], config["cutoff_minute"])
        if now_time > cutoff_time_obj:
            return True, cutoff_time_str, f"Response window closed at {cutoff_time_str} for batch cooking preparations.", cutoff_iso
        return False, cutoff_time_str, None, cutoff_iso


def get_menu_for_date_meal(db: Session, date_str: str, day_name: str, meal_type: str) -> tuple[str, str]:
    """Retrieve menu and category for a date and meal slot from prediction or weekly schedule."""
    pred = db.query(Prediction).filter(Prediction.date == date_str, Prediction.meal_type == meal_type).first()
    if pred and pred.main_menu_items:
        category = "Special Feast" if pred.special_meal == "Yes" else "Published Menu"
        return pred.main_menu_items, category

    sched_menu = ml_service.get_scheduled_menu(day_name, meal_type)
    if sched_menu:
        return sched_menu, "Regular Schedule"
    return "Menu not published yet", "Unscheduled"


def ensure_seed_notifications(db: Session):
    """Seed initial helpful mess notices if none exist."""
    existing_count = db.query(StudentNotification).count()
    if existing_count == 0:
        seed_notices = [
            StudentNotification(
                title="Welcome to Campus Mess Portal",
                message="Plan your meals ahead to help our kitchen reduce food waste and prepare fresher batches. Your intention responses directly guide food quantities.",
                category="announcement",
                is_read=False,
            ),
            StudentNotification(
                title="Daily Cutoff Policy",
                message="To ensure balanced portions and zero waste, intentions close 1.5 hours prior to meal service (Breakfast: 6:30 AM, Lunch: 11:00 AM, Dinner: 6:00 PM).",
                category="reminder",
                is_read=False,
            ),
            StudentNotification(
                title="Sunday Special Dinner",
                message="Afgani Paneer, Dal Tadka, and Kheer scheduled for Sunday dinner. Please submit your attendance intention early to assist portion scaling.",
                category="menu_change",
                is_read=False,
            ),
        ]
        db.add_all(seed_notices)
        db.commit()


@router.get("/dashboard", response_model=StudentDashboardResponse, summary="Get student dashboard data")
def get_student_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return today's 3 meals with status, intention, upcoming meals, and notices."""
    ensure_seed_notifications(db)
    today = date.today()
    today_str = today.isoformat()
    day_name = DAYS_LIST[today.weekday()]

    # Today's user intentions
    today_intentions = {
        i.meal_type: i
        for i in db.query(MealIntention).filter(
            MealIntention.user_id == current_user.id,
            MealIntention.date == today_str,
        ).all()
    }

    # Build today's 3 meal panels (Breakfast, Lunch, Dinner)
    today_meals: List[StudentMealItem] = []
    pending_count = 0

    for meal in ["Breakfast", "Lunch", "Dinner"]:
        cfg = MEAL_CONFIG[meal]
        is_closed, cutoff_str, closure_reason, cutoff_iso = get_cutoff_status(today_str, meal)
        menu_items, category = get_menu_for_date_meal(db, today_str, day_name, meal)
        intention = today_intentions.get(meal)

        if not intention and not is_closed:
            pending_count += 1

        today_meals.append(
            StudentMealItem(
                meal_type=meal,
                time_window=cfg["time_window"],
                cutoff_time=cutoff_str,
                cutoff_iso=cutoff_iso,
                is_closed=is_closed,
                closure_reason=closure_reason,
                menu_items=menu_items,
                category=category,
                current_intention=MealIntentionResponse.model_validate(intention) if intention else None,
            )
        )

    # Upcoming meals (Tomorrow and Day After)
    upcoming_meals = []
    for offset in range(1, 4):
        up_date = today + timedelta(days=offset)
        up_date_str = up_date.isoformat()
        up_day_name = DAYS_LIST[up_date.weekday()]

        for m_type in ["Breakfast", "Lunch", "Dinner"]:
            m_items, cat = get_menu_for_date_meal(db, up_date_str, up_day_name, m_type)
            user_int = db.query(MealIntention).filter(
                MealIntention.user_id == current_user.id,
                MealIntention.date == up_date_str,
                MealIntention.meal_type == m_type,
            ).first()

            upcoming_meals.append({
                "date": up_date_str,
                "day_name": up_day_name,
                "meal_type": m_type,
                "time_window": MEAL_CONFIG[m_type]["time_window"],
                "cutoff_time": MEAL_CONFIG[m_type]["cutoff_time"],
                "menu_items": m_items,
                "category": cat,
                "intention_status": user_int.status if user_int else None,
            })

    # Recent user intentions
    recent_intentions_records = (
        db.query(MealIntention)
        .filter(MealIntention.user_id == current_user.id)
        .order_by(MealIntention.updated_at.desc())
        .limit(6)
        .all()
    )
    recent_intentions = [MealIntentionResponse.model_validate(i) for i in recent_intentions_records]

    # Notifications
    notifications_records = (
        db.query(StudentNotification)
        .filter((StudentNotification.user_id == current_user.id) | (StudentNotification.user_id == None))
        .order_by(StudentNotification.created_at.desc())
        .limit(4)
        .all()
    )
    announcements = [StudentNotificationResponse.model_validate(n) for n in notifications_records]

    return StudentDashboardResponse(
        today_date=today_str,
        today_day_name=day_name,
        student_name=current_user.full_name or current_user.username,
        hostel_block=current_user.hostel_block or "Hostel Block A",
        room_number=current_user.room_number or "204",
        dietary_preference=current_user.dietary_preference or "Vegetarian",
        today_meals=today_meals,
        upcoming_meals=upcoming_meals[:6],
        recent_intentions=recent_intentions,
        announcements=announcements,
        pending_responses_count=pending_count,
    )


@router.get("/schedule", summary="Get 7-day chronological meal schedule with intentions")
def get_student_schedule(
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    days: int = Query(7, ge=1, le=14, description="Number of days to retrieve"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return chronological schedule of meals with published menus and current student intentions."""
    try:
        base_date = date.fromisoformat(start_date) if start_date else date.today()
    except ValueError:
        base_date = date.today()

    schedule_days = []
    for i in range(days):
        cur_date = base_date + timedelta(days=i)
        cur_date_str = cur_date.isoformat()
        day_name = DAYS_LIST[cur_date.weekday()]

        meals_for_day = []
        for meal in ["Breakfast", "Lunch", "Dinner"]:
            cfg = MEAL_CONFIG[meal]
            is_closed, cutoff_str, closure_reason, cutoff_iso = get_cutoff_status(cur_date_str, meal)
            menu_items, category = get_menu_for_date_meal(db, cur_date_str, day_name, meal)
            user_int = db.query(MealIntention).filter(
                MealIntention.user_id == current_user.id,
                MealIntention.date == cur_date_str,
                MealIntention.meal_type == meal,
            ).first()

            meals_for_day.append({
                "meal_type": meal,
                "time_window": cfg["time_window"],
                "cutoff_time": cutoff_str,
                "cutoff_iso": cutoff_iso,
                "is_closed": is_closed,
                "closure_reason": closure_reason,
                "menu_items": menu_items,
                "category": category,
                "current_intention": MealIntentionResponse.model_validate(user_int) if user_int else None,
            })

        schedule_days.append({
            "date": cur_date_str,
            "day_name": day_name,
            "is_today": cur_date == date.today(),
            "meals": meals_for_day,
        })

    return {"days": schedule_days}


@router.post(
    "/intentions",
    response_model=MealIntentionResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit or update a meal intention",
)
def save_meal_intention(
    data: MealIntentionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Save or update the student's intention for a specific meal.
    Validates cutoff window. Upserts the record.
    """
    is_closed, cutoff_str, reason, _ = get_cutoff_status(data.date, data.meal_type)
    if is_closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason or f"The response window for {data.meal_type} has closed.",
        )

    # Upsert intention
    existing = db.query(MealIntention).filter(
        MealIntention.user_id == current_user.id,
        MealIntention.date == data.date,
        MealIntention.meal_type == data.meal_type,
    ).first()

    if existing:
        existing.status = data.status
        existing.notes = data.notes.strip() if data.notes else None
        db.commit()
        db.refresh(existing)
        return MealIntentionResponse.model_validate(existing)

    new_intention = MealIntention(
        user_id=current_user.id,
        date=data.date,
        meal_type=data.meal_type,
        status=data.status,
        notes=data.notes.strip() if data.notes else None,
    )
    db.add(new_intention)
    db.commit()
    db.refresh(new_intention)
    return MealIntentionResponse.model_validate(new_intention)


@router.delete(
    "/intentions/{intention_id}",
    status_code=status.HTTP_200_OK,
    summary="Withdraw an intention before cutoff",
)
def withdraw_meal_intention(
    intention_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Withdraw a previously submitted intention before the cutoff window closes."""
    intention = db.query(MealIntention).filter(
        MealIntention.id == intention_id,
        MealIntention.user_id == current_user.id,
    ).first()

    if not intention:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intention record not found.")

    is_closed, _, reason, _ = get_cutoff_status(intention.date, intention.meal_type)
    if is_closed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=reason or "Cannot withdraw intention after response window has closed.",
        )

    db.delete(intention)
    db.commit()
    return {"message": "Meal intention withdrawn successfully."}


@router.get("/intentions", response_model=List[MealIntentionResponse], summary="Get student intentions history")
def get_user_intentions(
    meal_type: Optional[str] = Query(None, description="Filter by meal type"),
    period: Optional[str] = Query("all", description="Period: upcoming, past, all"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve filtered intentions for the student."""
    query = db.query(MealIntention).filter(MealIntention.user_id == current_user.id)
    today_str = date.today().isoformat()

    if meal_type:
        query = query.filter(MealIntention.meal_type == meal_type)

    if period == "upcoming":
        query = query.filter(MealIntention.date >= today_str).order_by(MealIntention.date.asc(), MealIntention.meal_type.asc())
    elif period == "past":
        query = query.filter(MealIntention.date < today_str).order_by(MealIntention.date.desc())
    else:
        query = query.order_by(MealIntention.date.desc(), MealIntention.created_at.desc())

    records = query.limit(100).all()
    return [MealIntentionResponse.model_validate(r) for r in records]


@router.post("/feedback", response_model=MealFeedbackResponse, status_code=status.HTTP_201_CREATED, summary="Submit meal feedback")
def submit_feedback(
    data: MealFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit quality and portion feedback for a meal."""
    feedback = MealFeedback(
        user_id=current_user.id,
        date=data.date,
        meal_type=data.meal_type,
        satisfaction_rating=data.satisfaction_rating,
        taste_rating=data.taste_rating,
        portion_size_rating=data.portion_size_rating,
        comments=data.comments.strip() if data.comments else None,
        is_anonymous=data.is_anonymous,
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return MealFeedbackResponse.model_validate(feedback)


@router.get("/feedback", response_model=List[MealFeedbackResponse], summary="Get student feedback history")
def get_user_feedbacks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve past feedbacks submitted by the student."""
    records = (
        db.query(MealFeedback)
        .filter(MealFeedback.user_id == current_user.id)
        .order_by(MealFeedback.created_at.desc())
        .limit(50)
        .all()
    )
    return [MealFeedbackResponse.model_validate(f) for f in records]


@router.get("/notifications", response_model=List[StudentNotificationResponse], summary="Get student notifications")
def get_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve notifications and notices for the student."""
    ensure_seed_notifications(db)
    records = (
        db.query(StudentNotification)
        .filter((StudentNotification.user_id == current_user.id) | (StudentNotification.user_id == None))
        .order_by(StudentNotification.created_at.desc())
        .all()
    )
    return [StudentNotificationResponse.model_validate(n) for n in records]


@router.put("/notifications/{notification_id}/read", status_code=status.HTTP_200_OK, summary="Mark notification as read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notif = db.query(StudentNotification).filter(StudentNotification.id == notification_id).first()
    if notif:
        notif.is_read = True
        db.commit()
    return {"message": "Notification marked as read."}


@router.put("/profile", response_model=UserResponse, summary="Update student profile and preferences")
def update_student_profile(
    data: StudentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update student hostel block, room number, dietary preference, and cutoff reminder hours."""
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()
    if data.email is not None:
        current_user.email = str(data.email).strip().lower()
    if data.hostel_block is not None:
        current_user.hostel_block = data.hostel_block.strip()
    if data.room_number is not None:
        current_user.room_number = data.room_number.strip()
    if data.dietary_preference is not None:
        current_user.dietary_preference = data.dietary_preference
    if data.reminder_cutoff_hours is not None:
        current_user.reminder_cutoff_hours = data.reminder_cutoff_hours

    db.commit()
    db.refresh(current_user)
    return UserResponse.model_validate(current_user)
