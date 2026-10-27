from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Prediction, User
from backend.app.routers.predictions import _enhance_prediction_response
from backend.app.schemas import DashboardSummaryResponse, MealWiseStat
from backend.app.security import require_manager_or_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Get aggregated statistics and recent predictions for manager dashboard",
)
def get_dashboard_summary(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    """
    Summarize saved prediction history.
    If no history exists, returns zeroed indicators with has_history=False
    so the frontend renders an informative, actionable empty state.
    """
    query = db.query(Prediction)
    if current_user.role != "admin":
        query = query.filter(Prediction.user_id == current_user.id)

    total_count = query.count()

    if total_count == 0:
        return DashboardSummaryResponse(
            total_predictions=0,
            avg_expected_students=0.0,
            avg_expected_food_kg=0.0,
            avg_expected_wastage_kg=0.0,
            avg_waste_percentage=0.0,
            recent_predictions=[],
            meal_wise_summary=[],
            has_history=False,
        )

    # Aggregates across saved predictions
    stats = (
        query.with_entities(
            func.avg(Prediction.expected_students).label("avg_students"),
            func.avg(Prediction.expected_food_required_kg).label("avg_food"),
            func.avg(Prediction.expected_food_wastage_kg).label("avg_waste"),
        ).first()
    )

    avg_students = round(float(stats.avg_students or 0.0), 1)
    avg_food = round(float(stats.avg_food or 0.0), 2)
    avg_waste = round(float(stats.avg_waste or 0.0), 2)
    avg_waste_pct = round((avg_waste / avg_food * 100), 2) if avg_food > 0 else 0.0

    # 5 Most recent predictions
    recent_records = (
        query.order_by(Prediction.date.desc(), Prediction.created_at.desc())
        .limit(5)
        .all()
    )

    # Aggregates grouped by meal type
    meal_stats_raw = (
        query.with_entities(
            Prediction.meal_type,
            func.count(Prediction.id).label("cnt"),
            func.avg(Prediction.expected_students).label("avg_students"),
            func.avg(Prediction.expected_food_required_kg).label("avg_food"),
            func.avg(Prediction.expected_food_wastage_kg).label("avg_waste"),
        )
        .group_by(Prediction.meal_type)
        .all()
    )

    meal_wise_list: List[MealWiseStat] = []
    # Ensure ordered representation: Breakfast, Lunch, Snacks, Dinner
    meal_order = ["Breakfast", "Lunch", "Snacks", "Dinner"]
    meal_dict = {row.meal_type: row for row in meal_stats_raw}

    for meal_name in meal_order:
        if meal_name in meal_dict:
            row = meal_dict[meal_name]
            f_avg = round(float(row.avg_food or 0.0), 2)
            w_avg = round(float(row.avg_waste or 0.0), 2)
            pct = round((w_avg / f_avg * 100), 2) if f_avg > 0 else 0.0
            meal_wise_list.append(
                MealWiseStat(
                    meal_type=meal_name,
                    count=int(row.cnt),
                    avg_expected_students=round(float(row.avg_students or 0.0), 1),
                    avg_expected_food_kg=f_avg,
                    avg_expected_wastage_kg=w_avg,
                    avg_waste_percentage=pct,
                )
            )

    return DashboardSummaryResponse(
        total_predictions=total_count,
        avg_expected_students=avg_students,
        avg_expected_food_kg=avg_food,
        avg_expected_wastage_kg=avg_waste,
        avg_waste_percentage=avg_waste_pct,
        recent_predictions=[_enhance_prediction_response(p, db=db) for p in recent_records],
        meal_wise_summary=meal_wise_list,
        has_history=True,
    )
