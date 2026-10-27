"""
Mess Manager Student Intention Monitoring & Training Data Export Router.

Implements:
- Aggregate meal intention counts for mess managers (Breakfast, Lunch, Dinner).
- Strict separation between meal-specific counts and distinct unique student counts.
- Authorized, filterable, paginated individual intention inspection.
- Future ML training dataset export utility (CSV / JSON) strictly keeping actuals separate.
- Role-based authorization: strictly restricted to managers and admins.
"""

import csv
from datetime import date, datetime
import io
import math
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import (
    MealIntention,
    MealIntentionAudit,
    Prediction,
    User,
)
from backend.app.schemas import (
    DateIntentionsSummaryResponse,
    DateMealRosterResponse,
    IntentionStudentRosterItem,
    ManagerMealIntentionDetail,
    MealIntentionAuditResponse,
    MealIntentionCountItem,
    PaginatedManagerIntentions,
)
from backend.app.security import require_manager_or_admin
from backend.app.validation import validate_meal_date, validate_meal_type

router = APIRouter(prefix="/intentions", tags=["Meal Intentions (Manager)"])

TRACKED_MEALS = ("Breakfast", "Lunch", "Dinner")


@router.get(
    "/summary",
    response_model=DateIntentionsSummaryResponse,
    summary="Get aggregated student meal intention headcounts for a selected date",
)
def get_intentions_summary(
    date_str: Optional[str] = Query(None, alias="date", description="Meal date in YYYY-MM-DD format"),
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve aggregated intention counts for a specific date:
    - Counts broken down by Breakfast, Lunch, Dinner: likely, unlikely, unsure, no_response.
    - Total submitted intentions across meals.
    - Total unique students who submitted >= 1 response (distinguished from per-meal counts).
    - Configured capacity (556 students) and total enrolled student count.
    """
    target_date = date_str.strip() if date_str else date.today().isoformat()
    try:
        validate_meal_date(target_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    capacity = settings.DEFAULT_MESS_CAPACITY
    total_students_enrolled = (
        db.query(func.count(User.id)).filter(User.role == "student", User.is_active == True).scalar() or 0
    )

    # Calculate meal-by-meal counts
    meal_items: List[MealIntentionCountItem] = []
    total_submitted_all_meals = 0

    for meal in TRACKED_MEALS:
        likely_count = (
            db.query(func.count(MealIntention.id))
            .filter(
                MealIntention.date == target_date,
                MealIntention.meal_type == meal,
                MealIntention.status == "likely",
            )
            .scalar()
            or 0
        )

        unlikely_count = (
            db.query(func.count(MealIntention.id))
            .filter(
                MealIntention.date == target_date,
                MealIntention.meal_type == meal,
                MealIntention.status == "unlikely",
            )
            .scalar()
            or 0
        )

        unsure_count = (
            db.query(func.count(MealIntention.id))
            .filter(
                MealIntention.date == target_date,
                MealIntention.meal_type == meal,
                MealIntention.status == "unsure",
            )
            .scalar()
            or 0
        )

        meal_total = likely_count + unlikely_count + unsure_count
        total_submitted_all_meals += meal_total
        no_response = max(0, capacity - meal_total)
        turnout_pct = round((likely_count / capacity * 100), 1) if capacity > 0 else 0.0

        meal_items.append(
            MealIntentionCountItem(
                meal_type=meal,
                likely_count=likely_count,
                unlikely_count=unlikely_count,
                unsure_count=unsure_count,
                total_submitted=meal_total,
                no_response_count=no_response,
                turnout_percentage=turnout_pct,
            )
        )

    # Distinct unique students who submitted at least one intention for this date
    # (A student answering breakfast, lunch, and dinner counts as ONE unique student)
    unique_students_count = (
        db.query(func.count(func.distinct(MealIntention.user_id)))
        .filter(MealIntention.date == target_date)
        .scalar()
        or 0
    )

    return DateIntentionsSummaryResponse(
        date=target_date,
        configured_capacity=capacity,
        total_students_enrolled=total_students_enrolled,
        total_submitted_intentions=total_submitted_all_meals,
        total_unique_students=unique_students_count,
        meals=meal_items,
    )


@router.get(
    "",
    response_model=PaginatedManagerIntentions,
    summary="Get paginated individual student meal intentions with filtering",
)
def get_manager_intentions_list(
    meal_date: Optional[str] = Query(None, alias="date", description="Filter by YYYY-MM-DD date"),
    meal_type: Optional[str] = Query(None, description="Filter by Breakfast, Lunch, or Dinner"),
    intention_status: Optional[str] = Query(None, alias="status", description="Filter by likely, unlikely, unsure"),
    search: Optional[str] = Query(None, description="Search by student name, username, room, or hostel block"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve an authorized, paginated list of individual student meal intentions for operational audit.
    Protects privacy: Only accessible by authenticated mess managers and admins.
    """
    query = (
        db.query(MealIntention, User)
        .join(User, MealIntention.user_id == User.id)
    )

    if meal_date:
        query = query.filter(MealIntention.date == meal_date.strip())
    if meal_type:
        query = query.filter(MealIntention.meal_type == meal_type.strip())
    if intention_status:
        query = query.filter(MealIntention.status == intention_status.strip().lower())
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_term),
                User.username.ilike(search_term),
                User.room_number.ilike(search_term),
                User.hostel_block.ilike(search_term),
            )
        )

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size

    rows = (
        query.order_by(MealIntention.date.desc(), MealIntention.updated_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    items: List[ManagerMealIntentionDetail] = []
    for intention, student in rows:
        items.append(
            ManagerMealIntentionDetail(
                id=intention.id,
                student_id=student.id,
                student_name=student.full_name or student.username,
                student_username=student.username,
                hostel_block=student.hostel_block,
                room_number=student.room_number,
                meal_date=intention.date,
                meal_type=intention.meal_type,
                intention_status=intention.status,
                notes=intention.notes,
                created_at=intention.created_at,
                updated_at=intention.updated_at,
            )
        )

    return PaginatedManagerIntentions(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/roster",
    response_model=DateMealRosterResponse,
    summary="Get categorized student names list (Yes, No, Maybe) for mess manager",
)
def get_intentions_student_roster(
    date_str: Optional[str] = Query(None, alias="date", description="Meal date in YYYY-MM-DD format"),
    meal_type: Optional[str] = Query(None, description="Optional meal type filter (Breakfast, Lunch, Dinner)"),
    search: Optional[str] = Query(None, description="Optional search by student name, roll, or room"),
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    """
    Retrieve categorized lists of student names who declared their intentions:
    - Yes (likely to attend)
    - No (not attending)
    - Maybe (unsure yet)
    Allows mess managers to inspect names for dining preparations, roll calls, and gate monitoring.
    """
    target_date = date_str.strip() if date_str else date.today().isoformat()
    try:
        validate_meal_date(target_date)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    query = (
        db.query(MealIntention, User)
        .join(User, MealIntention.user_id == User.id)
        .filter(MealIntention.date == target_date)
    )

    if meal_type:
        query = query.filter(MealIntention.meal_type == meal_type.strip())

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_term),
                User.username.ilike(search_term),
                User.room_number.ilike(search_term),
                User.hostel_block.ilike(search_term),
            )
        )

    rows = query.order_by(User.full_name.asc(), User.username.asc()).all()

    likely_list: List[IntentionStudentRosterItem] = []
    unlikely_list: List[IntentionStudentRosterItem] = []
    unsure_list: List[IntentionStudentRosterItem] = []
    all_list: List[IntentionStudentRosterItem] = []

    for intention, student in rows:
        item = IntentionStudentRosterItem(
            id=intention.id,
            student_id=student.id,
            student_name=student.full_name or student.username,
            student_username=student.username,
            hostel_block=student.hostel_block,
            room_number=student.room_number,
            meal_date=intention.date,
            meal_type=intention.meal_type,
            intention_status=intention.status,
            notes=intention.notes,
            updated_at=intention.updated_at,
        )
        all_list.append(item)
        if intention.status == "likely":
            likely_list.append(item)
        elif intention.status == "unlikely":
            unlikely_list.append(item)
        elif intention.status == "unsure":
            unsure_list.append(item)

    return DateMealRosterResponse(
        date=target_date,
        meal_type=meal_type.strip() if meal_type else None,
        total_responded=len(all_list),
        likely_count=len(likely_list),
        unlikely_count=len(unlikely_list),
        unsure_count=len(unsure_list),
        students_likely=likely_list,
        students_unlikely=unlikely_list,
        students_unsure=unsure_list,
        all_students=all_list,
    )


@router.get(
    "/export",
    summary="Export collected student intentions combined with operational records for future ML model training",
)
def export_training_dataset(
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    format_type: str = Query("csv", alias="format", regex="^(csv|json)$"),
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    """
    Prepare data foundation for future ML model training.
    Strict Rules (HCI & Software Engineering):
    - Exports student aggregate intentions alongside actuals only if measured.
    - Never fabricates actual attendance, food prepared, or food wasted.
    - Keeps actual fields empty/null when unverified.
    - Does NOT trigger automated model retraining.
    """
    # Fetch distinct date and meal_type pairs from intentions
    query = (
        db.query(MealIntention.date, MealIntention.meal_type)
        .group_by(MealIntention.date, MealIntention.meal_type)
        .order_by(MealIntention.date.asc(), MealIntention.meal_type.asc())
    )

    if start_date:
        query = query.filter(MealIntention.date >= start_date)
    if end_date:
        query = query.filter(MealIntention.date <= end_date)

    pairs = query.all()
    records = []

    for meal_date, meal_type in pairs:
        # Aggregate intentions for this date & meal
        likely_cnt = (
            db.query(func.count(MealIntention.id))
            .filter(
                MealIntention.date == meal_date,
                MealIntention.meal_type == meal_type,
                MealIntention.status == "likely",
            )
            .scalar()
            or 0
        )

        unlikely_cnt = (
            db.query(func.count(MealIntention.id))
            .filter(
                MealIntention.date == meal_date,
                MealIntention.meal_type == meal_type,
                MealIntention.status == "unlikely",
            )
            .scalar()
            or 0
        )

        total_int = (
            db.query(func.count(MealIntention.id))
            .filter(
                MealIntention.date == meal_date,
                MealIntention.meal_type == meal_type,
            )
            .scalar()
            or 0
        )

        # Match with saved prediction record if one exists
        pred = (
            db.query(Prediction)
            .filter(Prediction.date == meal_date, Prediction.meal_type == meal_type)
            .first()
        )

        # Operational actuals: ONLY from recorded post-meal measurements. Never fabricated.
        actual_att = pred.actual_attendance if pred and pred.actual_attendance is not None else ""
        actual_prep_kg = pred.actual_food_prepared_kg if pred and pred.actual_food_prepared_kg is not None else ""
        actual_waste_kg = pred.actual_food_wasted_kg if pred and pred.actual_food_wasted_kg is not None else ""

        records.append({
            "meal_date": meal_date,
            "meal_type": meal_type,
            "intentions_likely_count": likely_cnt,
            "intentions_unlikely_count": unlikely_cnt,
            "intentions_total_submitted": total_int,
            "mess_capacity_students": settings.DEFAULT_MESS_CAPACITY,
            "forecasted_students": pred.expected_students if pred else "",
            "actual_attendance": actual_att,
            "actual_food_prepared_kg": actual_prep_kg,
            "actual_food_wasted_kg": actual_waste_kg,
            "special_meal": pred.special_meal if pred else "No",
            "model_version": pred.model_version if pred else "1.0.0",
            "data_provenance": "verified_intentions_and_operational_records",
        })

    if format_type == "json":
        return {
            "disclaimer": (
                "Dataset exported for offline ML model exploration and validation. "
                "Unmeasured actual fields are strictly null. No automated retraining is performed."
            ),
            "total_records": len(records),
            "data": records,
        }

    # Generate CSV in-memory
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=[
            "meal_date",
            "meal_type",
            "intentions_likely_count",
            "intentions_unlikely_count",
            "intentions_total_submitted",
            "mess_capacity_students",
            "forecasted_students",
            "actual_attendance",
            "actual_food_prepared_kg",
            "actual_food_wasted_kg",
            "special_meal",
            "model_version",
            "data_provenance",
        ],
    )
    writer.writeheader()
    for row in records:
        writer.writerow(row)

    output.seek(0)
    filename = f"mess_intentions_ml_dataset_{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
