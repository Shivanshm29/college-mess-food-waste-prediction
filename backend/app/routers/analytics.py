from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models import Prediction, User
from backend.app.schemas import (
    AnalyticsSummaryResponse,
    MealWiseStat,
    TimelineDataPoint,
)
from backend.app.security import require_manager_or_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get(
    "/summary",
    response_model=AnalyticsSummaryResponse,
    summary="Get descriptive analytics and timeline series based on saved predictions",
)
def get_analytics_summary(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db),
):
    """
    Return descriptive statistics and chart series based purely on persisted prediction history.
    Does NOT invent unmeasured actual outcomes.
    """
    query = db.query(Prediction)
    if current_user.role != "admin":
        query = query.filter(Prediction.user_id == current_user.id)

    total_count = query.count()
    if total_count == 0:
        return AnalyticsSummaryResponse(
            total_records=0,
            total_expected_food_kg=0.0,
            total_expected_wastage_kg=0.0,
            overall_waste_percentage=0.0,
            by_meal=[],
            timeline=[],
            has_history=False,
        )

    # Totals
    totals = (
        query.with_entities(
            func.sum(Prediction.expected_food_required_kg).label("total_food"),
            func.sum(Prediction.expected_food_wastage_kg).label("total_waste"),
        ).first()
    )

    tot_food = round(float(totals.total_food or 0.0), 2)
    tot_waste = round(float(totals.total_waste or 0.0), 2)
    overall_waste_pct = round((tot_waste / tot_food * 100), 2) if tot_food > 0 else 0.0

    # Meal Breakdown
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

    # Timeline points (ordered chronologically by date and id, up to last 50 points)
    timeline_records = (
        query.order_by(Prediction.date.asc(), Prediction.id.asc())
        .limit(100)
        .all()
    )

    timeline_points: List[TimelineDataPoint] = []
    for p in timeline_records:
        w_pct = round((p.expected_food_wastage_kg / p.expected_food_required_kg * 100), 2) if p.expected_food_required_kg > 0 else 0.0
        timeline_points.append(
            TimelineDataPoint(
                date=p.date,
                meal_type=p.meal_type,
                expected_students=p.expected_students,
                expected_food_required_kg=p.expected_food_required_kg,
                expected_food_wastage_kg=p.expected_food_wastage_kg,
                waste_percentage=w_pct,
            )
        )

    return AnalyticsSummaryResponse(
        total_records=total_count,
        total_expected_food_kg=tot_food,
        total_expected_wastage_kg=tot_waste,
        overall_waste_percentage=overall_waste_pct,
        by_meal=meal_wise_list,
        timeline=timeline_points,
        has_history=True,
    )
