from datetime import date
from fastapi import APIRouter, Depends
from backend.app.ml_service import ml_service
from backend.app.models import User
from backend.app.schemas import ModelInfoResponse, ModelPreviewResponse, PredictionCreate
from backend.app.security import get_current_user

router = APIRouter(prefix="/model", tags=["Model Information"])


@router.get(
    "/info",
    response_model=ModelInfoResponse,
    summary="Get model architecture, training metrics, features, targets, and limitations",
)
def get_model_info():
    """
    Return complete metadata regarding the machine learning models:
    algorithm, features, targets, chronological evaluation metrics (MAE, RMSE, R²),
    and clear transparency disclosures about dataset limitations.
    """
    return ml_service.get_info()


@router.post(
    "/preview",
    response_model=ModelPreviewResponse,
    summary="Execute live ML model inference sandbox without database persistence",
)
def preview_model_prediction(
    data: PredictionCreate,
    current_user: User = Depends(get_current_user),
):
    """
    Run the production pipeline and return raw vs domain-bounded outputs,
    calculated ratios, and active safeguards for real-time model inspection.
    """
    parsed_date = date.fromisoformat(data.date)
    day_name = parsed_date.strftime("%A")
    is_weekend = parsed_date.weekday() >= 5

    special_meal_val = "Yes" if data.special_meal == "Yes" else "No"
    menu_item_val = data.main_menu_items.strip()
    if special_meal_val == "Yes":
        menu_item_val = "Special"
    elif not menu_item_val:
        menu_item_val = ml_service.get_scheduled_menu(day_name, data.meal_type, special_meal_val)


    input_payload = {
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
        pred = ml_service.predict(input_payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )


    safeguards = []
    if pred["raw_expected_students"] > data.mess_capacity_students:
        safeguards.append(f"Capacity Ceiling: Clamped from {pred['raw_expected_students']} to {data.mess_capacity_students} students")
    elif pred["raw_expected_students"] < 0:
        safeguards.append(f"Non-Negative Students: Clamped from {pred['raw_expected_students']} to 0")

    if pred["raw_expected_food_required_kg"] < 0:
        safeguards.append(f"Non-Negative Food: Clamped from {pred['raw_expected_food_required_kg']} kg to 0 kg")

    if pred["raw_expected_food_wastage_kg"] > pred["expected_food_required_kg"]:
        safeguards.append(f"Conservation of Mass: Wastage clamped to total food prepared ({pred['expected_food_required_kg']} kg)")
    elif pred["raw_expected_food_wastage_kg"] < 0:
        safeguards.append("Non-Negative Wastage: Clamped to 0 kg")

    waste_pct = round((pred["expected_food_wastage_kg"] / pred["expected_food_required_kg"] * 100), 2) if pred["expected_food_required_kg"] > 0 else 0.0
    food_per_student = round((pred["expected_food_required_kg"] / pred["expected_students"]), 3) if pred["expected_students"] > 0 else 0.0

    return {
        "expected_students": pred["expected_students"],
        "expected_food_required_kg": pred["expected_food_required_kg"],
        "expected_food_wastage_kg": pred["expected_food_wastage_kg"],
        "raw_expected_students": pred["raw_expected_students"],
        "raw_expected_food_required_kg": pred["raw_expected_food_required_kg"],
        "raw_expected_food_wastage_kg": pred["raw_expected_food_wastage_kg"],
        "waste_percentage": waste_pct,
        "food_per_student_kg": food_per_student,
        "safeguards_triggered": safeguards,
    }

