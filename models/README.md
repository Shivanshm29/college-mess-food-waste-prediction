# ML Models Directory — College Mess Planning & Food Waste Prediction

This folder is the designated repository for your trained machine learning model artifacts.

---

## 1. Required Files

To integrate your trained model into the application, place the following file in this folder:

| File Name | Required? | Description |
|---|:---:|---|
| **`mess_prediction_model.joblib`** | **YES (Required)** | Serialized Python model bundle saved via `joblib.dump()`. |
| **`mess_model_metrics.json`** | Optional | Evaluation metrics (MAE, RMSE, R²) displayed on the Model Information dashboard. |

> **Note:** The backend checks both this `models/` directory and the project root directory. Placing `mess_prediction_model.joblib` in either location will work immediately.

---

## 2. Expected Model Bundle Structure (`mess_prediction_model.joblib`)

The `.joblib` file must be a serialized Python dictionary with the following keys:

```python
{
    # 1. Dictionary of trained model pipelines or estimators for each of the 3 targets:
    "models": {
        "expected_students": model_or_pipeline_for_students,
        "expected_food_required_kg": model_or_pipeline_for_food,
        "expected_food_wastage_kg": model_or_pipeline_for_wastage,
    },
    
    # 2. List of input feature names in expected order:
    "features": [
        "day_of_week",
        "is_weekend",
        "is_holiday",
        "exam_on_day",
        "college_event",
        "weather_condition",
        "meal_type",
        "main_menu_items",
        "special_meal",
        "mess_capacity_students",
    ],
    
    # 3. List of target names:
    "targets": [
        "expected_students",
        "expected_food_required_kg",
        "expected_food_wastage_kg",
    ],
    
    # 4. Metadata:
    "version": "1.0.0",                 # String version identifier
    "capacity_default": 556             # Registered student headcount
}
```

Each model in `"models"` must implement a standard `.predict(X)` method accepting a `pandas.DataFrame` containing the 10 input features.

---

## 3. Input Features Specification

When running predictions, the application passes a single-row `pandas.DataFrame` with these columns and types:

| Feature Name | Pandas/Python Type | Permitted Values / Examples |
|---|---|---|
| `day_of_week` | `str` | `"Monday"`, `"Tuesday"`, `"Wednesday"`, `"Thursday"`, `"Friday"`, `"Saturday"`, `"Sunday"` |
| `is_weekend` | `bool` | `True` (Saturday, Sunday), `False` (Monday-Friday) |
| `is_holiday` | `bool` | `True` / `False` |
| `exam_on_day` | `bool` | `True` / `False` |
| `college_event` | `bool` | `True` / `False` |
| `weather_condition` | `str` | `"Clear"`, `"Rainy"`, `"Cold"` |
| `meal_type` | `str` | `"Breakfast"`, `"Lunch"`, `"Snacks"`, `"Dinner"` |
| `main_menu_items` | `str` | Text recipe (e.g., `"Rajma Masala, Rice, Chapati"`) or `"Special"` |
| `special_meal` | `str` | `"Yes"` / `"No"` |
| `mess_capacity_students` | `int` | Integer population ceiling (e.g. `556`) |

---

## 4. Output Targets Specification

Your model must predict these 3 continuous numeric targets:

1. **`expected_students`**: Float turnout headcount (system bounds to $[0, \text{mess\_capacity\_students}]$).
2. **`expected_food_required_kg`**: Float total cooking batch weight in kg (system bounds to $\ge 0.0\text{ kg}$).
3. **`expected_food_wastage_kg`**: Float plate/serving leftovers in kg (system bounds to $[0.0, \text{expected\_food\_required\_kg}]$).

---

## 5. Instant Training Script

If you have a CSV dataset (e.g., `mess_planning_training_dataset_556_students_patterned.csv`), you can train and export a new model bundle with a single command:

```bash
# Trains the model and saves mess_prediction_model.joblib and mess_model_metrics.json
python train_model.py --data your_dataset.csv --model-out models/mess_prediction_model.joblib --metrics-out models/mess_model_metrics.json
```

---

## 6. Hot-Reloading

The FastAPI backend automatically checks this directory upon incoming prediction requests. **No server restart is required** once `mess_prediction_model.joblib` is placed here.
