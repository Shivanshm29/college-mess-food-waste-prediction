from datetime import date, datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.ml_service import ml_service
from backend.app.models import Prediction, User
from backend.app.schemas import (
    ActualOutcomeCreate,
    MealType,
    MenuRecommendation,
    MenuRecommendationRequest,
    NextMealFeaturesResponse,
    PaginatedPredictions,
    PredictionCreate,
    PredictionResponse,
    SpecialMealType,
)
from backend.app.security import get_current_user, require_manager_or_admin
from backend.app.validation import calculate_special_meal_target

router = APIRouter(prefix="/predictions", tags=["Predictions"])


def _enhance_prediction_response(
    p: Prediction,
    include_recommendations: bool = False,
    db: Optional[Session] = None,
) -> PredictionResponse:
    """Add computed usability indicators, special meal rule overlays, student intentions context, and actuals differences to prediction response."""
    waste_pct = round((p.expected_food_wastage_kg / p.expected_food_required_kg * 100), 2) if p.expected_food_required_kg > 0 else 0.0
    food_per_student = round((p.expected_food_required_kg / p.expected_students), 3) if p.expected_students > 0 else 0.0
    turnout_pct = round((p.expected_students / p.mess_capacity_students * 100), 1) if p.mess_capacity_students > 0 else 0.0
    is_low = ml_service.is_low_attendance(p.expected_students, p.mess_capacity_students)

    resp = PredictionResponse.model_validate(p)
    resp.waste_percentage = waste_pct
    resp.food_per_student_kg = food_per_student
    resp.is_low_turnout = is_low
    resp.turnout_percentage = turnout_pct

    # Operational Rule: Special Meal Target (Clearly distinguished from ML model output)
    if p.special_meal == "Yes":
        target = calculate_special_meal_target(p.mess_capacity_students)
        resp.special_meal_target = target
        resp.rule_target_students = target
        resp.rule_explanation = (
            f"Special meal operational assumption: Target attendance is at least 94% of mess capacity "
            f"({target} of {p.mess_capacity_students} students). ML model forecast is {round(p.expected_students)} students."
        )

    # Contextual Student Intentions (Submitted voluntary self-reports before cutoff)
    if db is not None:
        from backend.app.models import MealIntention
        likely_cnt = (
            db.query(func.count(MealIntention.id))
            .filter(
                MealIntention.date == p.date,
                MealIntention.meal_type == p.meal_type,
                MealIntention.status == "likely",
            )
            .scalar()
            or 0
        )
        unlikely_cnt = (
            db.query(func.count(MealIntention.id))
            .filter(
                MealIntention.date == p.date,
                MealIntention.meal_type == p.meal_type,
                MealIntention.status == "unlikely",
            )
            .scalar()
            or 0
        )
        total_int = (
            db.query(func.count(MealIntention.id))
            .filter(
                MealIntention.date == p.date,
                MealIntention.meal_type == p.meal_type,
            )
            .scalar()
            or 0
        )
        if total_int > 0:
            resp.intentions_likely_count = likely_cnt
            resp.intentions_unlikely_count = unlikely_cnt
            resp.intentions_total_submitted = total_int
            resp.intentions_summary_note = (
                f"Student intentions: {likely_cnt} likely to attend, {unlikely_cnt} not attending ({total_int} total responses)."
            )

    # Actual outcome tracking and variance calculation
    has_act = (
        p.actual_attendance is not None
        or p.actual_food_prepared_kg is not None
        or p.actual_food_wasted_kg is not None
    )
    resp.has_actuals = has_act
    if p.actual_attendance is not None:
        resp.attendance_difference = round(p.actual_attendance - p.expected_students, 1)
    if p.actual_food_prepared_kg is not None:
        resp.food_difference_kg = round(p.actual_food_prepared_kg - p.expected_food_required_kg, 2)
    if p.actual_food_wasted_kg is not None:
        resp.waste_difference_kg = round(p.actual_food_wasted_kg - p.expected_food_wastage_kg, 2)

    # Generate proactive recommendations if attendance is low or specifically requested
    if include_recommendations or is_low:
        feature_payload = {
            "day_of_week": p.day_of_week,
            "is_weekend": p.is_weekend,
            "is_holiday": p.is_holiday,
            "exam_on_day": p.exam_on_day,
            "college_event": p.college_event,
            "weather_condition": p.weather_condition,
            "meal_type": p.meal_type,
            "main_menu_items": p.main_menu_items,
            "mess_capacity_students": p.mess_capacity_students,
            "special_meal": p.special_meal,
        }
        current_pred = {
            "expected_students": p.expected_students,
            "expected_food_required_kg": p.expected_food_required_kg,
            "expected_food_wastage_kg": p.expected_food_wastage_kg,
        }
        recs = ml_service.recommend_menu_improvements(feature_payload, current_pred)
        resp.menu_recommendations = [MenuRecommendation(**r) for r in recs]

    return resp


@router.get("/menu-options", summary="Get standard menu items per meal for autocomplete")
def get_menu_options(current_user: User = Depends(get_current_user)):
    """Return categorized standard menu options for each meal type."""
    return ml_service.get_known_menus()


@router.post(
    "/recommendations",
    response_model=List[MenuRecommendation],
    summary="Get prescriptive menu recommendations to increase turnout and reduce waste",
)
def get_menu_recommendations(
    data: MenuRecommendationRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Evaluate candidate menus for operational conditions and return optimized suggestions.
    Does not persist anything in the database; enables real-time what-if exploration.
    """
    parsed_date = date.fromisoformat(data.date)
    day_name = parsed_date.strftime("%A")
    is_weekend = parsed_date.weekday() >= 5

    special_meal_val = "Yes" if data.special_meal == "Yes" else "No"
    menu_item_val = (data.main_menu_items or "").strip()
    if special_meal_val == "Yes":
        menu_item_val = "Special"
    elif not menu_item_val:
        menu_item_val = ml_service.get_scheduled_menu(day_name, data.meal_type, special_meal_val)

    feature_payload = {
        "day_of_week": day_name,
        "is_weekend": is_weekend,
        "is_holiday": data.is_holiday,
        "exam_on_day": data.exam_on_day,
        "college_event": data.college_event,
        "weather_condition": data.weather_condition,
        "meal_type": data.meal_type,
        "main_menu_items": menu_item_val,
        "mess_capacity_students": data.mess_capacity_students,
        "special_meal": special_meal_val,
    }

    try:
        recs = ml_service.recommend_menu_improvements(feature_payload)
        return [MenuRecommendation(**r) for r in recs]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Unable to generate recommendations: {str(e)}",
        )



@router.post(
    "",
    response_model=PredictionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate, validate, and persist a meal prediction",
)
def create_prediction(
    data: PredictionCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    """
    Validate meal planning inputs, run ML regression models, enforce domain bounds,
    and persist the record bound to the authenticated manager/admin user.
    """
    # Parse date to derive day of week and weekend flag reliably
    parsed_date = date.fromisoformat(data.date)
    day_name = parsed_date.strftime("%A")  # Monday, Tuesday, etc.
    is_weekend = parsed_date.weekday() >= 5  # 5=Saturday, 6=Sunday

    special_meal_val = "Yes" if data.special_meal == "Yes" else "No"
    menu_item_val = data.main_menu_items.strip()
    if special_meal_val == "Yes":
        menu_item_val = "Special"
    elif not menu_item_val:
        menu_item_val = ml_service.get_scheduled_menu(day_name, data.meal_type, special_meal_val)

    # Assemble feature payload for ML pipeline
    feature_payload = {
        "day_of_week": day_name,
        "is_weekend": is_weekend,
        "is_holiday": data.is_holiday,
        "exam_on_day": data.exam_on_day,
        "college_event": data.college_event,
        "weather_condition": data.weather_condition,
        "meal_type": data.meal_type,
        "main_menu_items": menu_item_val,
        "mess_capacity_students": data.mess_capacity_students,
        "special_meal": special_meal_val,
    }

    try:
        results = ml_service.predict(feature_payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"{str(e)}",
        )

    # Check if actual outcomes were supplied
    actual_att = data.actual_attendance or data.attendance
    has_actuals = actual_att is not None or data.actual_food_prepared_kg is not None or data.actual_food_wasted_kg is not None

    # Persist prediction in SQLite database (Never trust user_id from client body!)
    prediction = Prediction(
        user_id=current_user.id,
        date=data.date,
        day_of_week=day_name,
        is_weekend=is_weekend,
        is_holiday=data.is_holiday,
        exam_on_day=data.exam_on_day,
        college_event=data.college_event,
        weather_condition=data.weather_condition,
        meal_type=data.meal_type,
        main_menu_items=menu_item_val,
        mess_capacity_students=data.mess_capacity_students,
        special_meal=special_meal_val,
        expected_students=results["expected_students"],
        expected_food_required_kg=results["expected_food_required_kg"],
        expected_food_wastage_kg=results["expected_food_wastage_kg"],
        actual_attendance=actual_att,
        actual_food_prepared_kg=data.actual_food_prepared_kg,
        actual_food_wasted_kg=data.actual_food_wasted_kg,
        recorded_at=datetime.now(timezone.utc) if has_actuals else None,
        model_version=ml_service.model_version,
        notes=data.notes.strip() if data.notes else None,
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)

    return _enhance_prediction_response(prediction, include_recommendations=True, db=db)


@router.get(
    "/next-meal",
    response_model=NextMealFeaturesResponse,
    summary="Get auto-populated input features for the next upcoming meal",
)
def get_next_available_meal_features(
    current_user: User = Depends(require_manager_or_admin),
):
    """
    Shortcut endpoint for mess managers to quickly retrieve all input features for the next
    upcoming available meal without manual entry. Auto-determines date, meal slot, scheduled
    menu, special meal rules, calendar holiday status, capacity, and default weather.
    """
    now = datetime.now()
    hour = now.hour
    minute = now.minute
    time_val = hour + minute / 60.0

    target_date = now.date()
    is_tomorrow = False
    meal_type: MealType = "Breakfast"
    time_window = "7:30 AM - 9:30 AM"

    if time_val < 9.5:
        meal_type = "Breakfast"
        time_window = "7:30 AM - 9:30 AM"
    elif time_val < 14.5:
        meal_type = "Lunch"
        time_window = "12:30 PM - 2:30 PM"
    elif time_val < 17.5:
        meal_type = "Snacks"
        time_window = "4:30 PM - 6:00 PM"
    elif time_val < 21.5:
        meal_type = "Dinner"
        time_window = "7:30 PM - 9:30 PM"
    else:
        target_date = target_date + timedelta(days=1)
        is_tomorrow = True
        meal_type = "Breakfast"
        time_window = "7:30 AM - 9:30 AM"

    days_list = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_name = days_list[target_date.weekday()]
    is_sunday = target_date.weekday() == 6

    special_meal: SpecialMealType = "Yes" if (is_sunday and meal_type == "Dinner") else "No"
    menu_items = ml_service.get_scheduled_menu(day_name, meal_type, special_meal)
    date_str = target_date.isoformat()

    label = f"Tomorrow's {meal_type}" if is_tomorrow else f"Today's {meal_type}"
    desc = f"Next scheduled dining service is {label} ({time_window}) on {day_name}, {date_str}."

    return NextMealFeaturesResponse(
        date=date_str,
        day_of_week=day_name,
        is_tomorrow=is_tomorrow,
        meal_type=meal_type,
        main_menu_items=menu_items,
        special_meal=special_meal,
        mess_capacity_students=settings.DEFAULT_MESS_CAPACITY,
        is_holiday=is_sunday,
        exam_on_day=False,
        college_event=False,
        weather_condition="Clear",
        notes=f"Auto-filled shortcut for {label} ({day_name}, {date_str})",
        time_window=time_window,
        label=label,
        description=desc,
    )


@router.get(
    "",
    response_model=PaginatedPredictions,
    summary="Get paginated prediction history with filters",
)
def get_predictions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    meal_type: Optional[str] = Query(None, description="Filter by meal type"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search menu items or notes"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve saved prediction history for the authenticated user with search and filtering."""
    query = db.query(Prediction)

    # Restrict to current user's records unless admin
    if current_user.role != "admin":
        query = query.filter(Prediction.user_id == current_user.id)

    # Apply filters
    if meal_type:
        query = query.filter(Prediction.meal_type == meal_type)
    if start_date:
        query = query.filter(Prediction.date >= start_date)
    if end_date:
        query = query.filter(Prediction.date <= end_date)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Prediction.main_menu_items.ilike(search_term))
            | (Prediction.notes.ilike(search_term))
            | (Prediction.day_of_week.ilike(search_term))
        )

    total = query.count()
    offset = (page - 1) * page_size
    records = (
        query.order_by(Prediction.date.desc(), Prediction.created_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    total_pages = max(1, (total + page_size - 1) // page_size) if total > 0 else 1

    return PaginatedPredictions(
        items=[_enhance_prediction_response(p, db=db) for p in records],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/{prediction_id}",
    response_model=PredictionResponse,
    summary="Retrieve single prediction detail with authorization check",
)
def get_prediction_by_id(
    prediction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a specific prediction by ID with strict ownership validation."""
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction with ID {prediction_id} not found.",
        )

    # Verify resource ownership
    if prediction.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this prediction record.",
        )

    return _enhance_prediction_response(prediction, include_recommendations=True, db=db)


@router.get(
    "/{prediction_id}/recommendations",
    response_model=List[MenuRecommendation],
    summary="Retrieve menu optimization suggestions for a specific historical prediction",
)
def get_prediction_recommendations_by_id(
    prediction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return menu recommendations for an existing saved prediction record."""
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction with ID {prediction_id} not found.",
        )

    if prediction.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view this prediction record.",
        )

    feature_payload = {
        "day_of_week": prediction.day_of_week,
        "is_weekend": prediction.is_weekend,
        "is_holiday": prediction.is_holiday,
        "exam_on_day": prediction.exam_on_day,
        "college_event": prediction.college_event,
        "weather_condition": prediction.weather_condition,
        "meal_type": prediction.meal_type,
        "main_menu_items": prediction.main_menu_items,
        "mess_capacity_students": prediction.mess_capacity_students,
        "special_meal": prediction.special_meal,
    }
    current_pred = {
        "expected_students": prediction.expected_students,
        "expected_food_required_kg": prediction.expected_food_required_kg,
        "expected_food_wastage_kg": prediction.expected_food_wastage_kg,
    }
    recs = ml_service.recommend_menu_improvements(feature_payload, current_pred)
    return [MenuRecommendation(**r) for r in recs]



@router.delete(
    "/{prediction_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete single prediction record with ownership check",
)
def delete_prediction(
    prediction_id: int,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    """Delete a prediction record with manager ownership verification."""
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction with ID {prediction_id} not found.",
        )

    if prediction.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this prediction record.",
        )

    db.delete(prediction)
    db.commit()
    return {"message": f"Prediction record {prediction_id} has been deleted."}


@router.post(
    "/{prediction_id}/actuals",
    response_model=PredictionResponse,
    summary="Record post-meal actual attendance, prepared food, and wastage",
)
@router.put(
    "/{prediction_id}/actuals",
    response_model=PredictionResponse,
    summary="Update post-meal actual attendance, prepared food, and wastage",
)
def record_actual_outcome(
    prediction_id: int,
    data: ActualOutcomeCreate,
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    """
    Record verified post-meal measurements (actual attendance, food prepared kg, food wasted kg).
    Clearly distinguishes actual observations from ML forecasts and calculates differences.
    """
    prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
    if not prediction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Prediction with ID {prediction_id} not found.",
        )

    if prediction.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this prediction record.",
        )

    prediction.actual_attendance = data.actual_attendance
    prediction.actual_food_prepared_kg = data.actual_food_prepared_kg
    prediction.actual_food_wasted_kg = data.actual_food_wasted_kg
    prediction.recorded_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(prediction)

    return _enhance_prediction_response(prediction, db=db)
