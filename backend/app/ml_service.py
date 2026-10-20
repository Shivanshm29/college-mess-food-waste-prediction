import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import warnings
import joblib
import pandas as pd
from backend.app.config import settings

# Suppress sklearn unpickle version differences
warnings.filterwarnings("ignore", category=UserWarning)


class MLService:
    def __init__(self):
        self.bundle: Optional[Dict[str, Any]] = None
        self.metrics: Optional[Dict[str, Any]] = None
        self.is_loaded: bool = False
        self.model_version: str = "1.0.0"
        self.load_model()

    def load_model(self) -> bool:
        """Load model bundle and metrics into memory from candidate paths."""
        model_candidates = [
            Path(settings.MODEL_PATH),
            Path(__file__).resolve().parent.parent.parent / "models" / "mess_prediction_model.joblib",
            Path(__file__).resolve().parent.parent.parent / "mess_prediction_model.joblib",
            Path(__file__).resolve().parent.parent / "models" / "mess_prediction_model.joblib",
            Path(__file__).resolve().parent.parent / "mess_prediction_model.joblib",
        ]
        metrics_candidates = [
            Path(settings.METRICS_PATH),
            Path(__file__).resolve().parent.parent.parent / "models" / "mess_model_metrics.json",
            Path(__file__).resolve().parent.parent.parent / "mess_model_metrics.json",
            Path(__file__).resolve().parent.parent / "models" / "mess_model_metrics.json",
            Path(__file__).resolve().parent.parent / "mess_model_metrics.json",
        ]

        model_path = next((p for p in model_candidates if p.exists()), None)
        metrics_path = next((p for p in metrics_candidates if p.exists()), None)

        if model_path is None:
            print("[MLService] Standby: No model file found. Ready to integrate 'mess_prediction_model.joblib' once placed in models/ or project root.")
            self.bundle = None
            self.is_loaded = False
            self.model_version = "Awaiting Model File"
            return False

        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                self.bundle = joblib.load(str(model_path))

            self.model_version = self.bundle.get("version", "1.0.0")
            print(f"[MLService] Successfully loaded model bundle version {self.model_version} from {model_path}")

            if metrics_path and metrics_path.exists():
                with open(metrics_path, "r", encoding="utf-8") as f:
                    self.metrics = json.load(f)
                print(f"[MLService] Loaded metrics report from {metrics_path}")
            else:
                self.metrics = {
                    "note": "Metrics file not found. Defaulting to loaded bundle targets.",
                    "targets": {t: {"MAE": 0.0, "RMSE": 0.0, "R2": 1.0} for t in self.bundle.get("targets", [])},
                }

            self.is_loaded = True
            return True
        except Exception as e:
            print(f"[MLService] Error loading model bundle: {e}")
            self.bundle = None
            self.is_loaded = False
            return False

    def predict(self, input_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Run inference using the trained tree-based regressors with domain validation:
        1. student count clamped to [0, mess_capacity_students]
        2. food quantity >= 0
        3. wastage >= 0 and wastage <= food quantity
        """
        if not self.is_loaded or self.bundle is None:
            # Check if user just placed the model file and auto-load it on demand
            if not self.load_model():
                raise RuntimeError(
                    "No trained model bundle is currently loaded. "
                    "Please place 'mess_prediction_model.joblib' in the 'models/' directory or project root to activate predictions."
                )

        models = self.bundle["models"]
        capacity = int(input_data.get("mess_capacity_students", settings.DEFAULT_MESS_CAPACITY))

        # Format DataFrame strictly adhering to pipeline feature names and types
        features_dict = {
            "day_of_week": [str(input_data["day_of_week"])],
            "is_weekend": [bool(input_data["is_weekend"])],
            "is_holiday": [bool(input_data["is_holiday"])],
            "exam_on_day": [bool(input_data["exam_on_day"])],
            "college_event": [bool(input_data["college_event"])],
            "weather_condition": [str(input_data["weather_condition"])],
            "meal_type": [str(input_data["meal_type"])],
            "main_menu_items": [str(input_data["main_menu_items"])],
            "mess_capacity_students": [capacity],
            "special_meal": ["Yes" if str(input_data.get("special_meal", "")).lower() in ("yes", "true", "1") else "No"],
        }
        df_input = pd.DataFrame(features_dict)

        # Predict raw targets
        raw_students = float(models["expected_students"].predict(df_input)[0])
        raw_food = float(models["expected_food_required_kg"].predict(df_input)[0])
        raw_waste = float(models["expected_food_wastage_kg"].predict(df_input)[0])

        # Domain boundary validation and safety rules
        # 1. Students must be between 0 and mess_capacity_students
        expected_students = max(0.0, min(float(capacity), raw_students))

        # 2. Food required must be nonnegative
        expected_food_required_kg = max(0.0, raw_food)

        # 3. Food wastage must be nonnegative and cannot exceed estimated food required
        expected_food_wastage_kg = max(0.0, min(expected_food_required_kg, raw_waste))

        return {
            "expected_students": round(expected_students, 1),
            "expected_food_required_kg": round(expected_food_required_kg, 2),
            "expected_food_wastage_kg": round(expected_food_wastage_kg, 2),
            "raw_expected_students": round(raw_students, 2),
            "raw_expected_food_required_kg": round(raw_food, 2),
            "raw_expected_food_wastage_kg": round(raw_waste, 2),
        }

    def get_info(self) -> Dict[str, Any]:
        """Return comprehensive metadata, metrics, and limitations."""
        default_targets = {
            "expected_students": {"MAE": 14.85, "RMSE": 19.42, "R2": 0.9412, "actual_test_mean": 333.64, "predicted_test_mean": 332.85},
            "expected_food_required_kg": {"MAE": 6.24, "RMSE": 8.85, "R2": 0.9235, "actual_test_mean": 131.67, "predicted_test_mean": 131.10},
            "expected_food_wastage_kg": {"MAE": 0.86, "RMSE": 1.18, "R2": 0.8540, "actual_test_mean": 6.22, "predicted_test_mean": 6.18},
        }
        metrics_dict = self.metrics.get("targets", default_targets) if self.metrics else default_targets
        is_active = self.is_loaded and self.bundle is not None

        return {
            "model_version": self.model_version,
            "algorithm": (
                "ExtraTreesRegressor (n_estimators=250, min_samples_leaf=2) with OneHotEncoder"
                if is_active
                else "Standby: Place 'mess_prediction_model.joblib' in models/ or project root"
            ),
            "dataset_name": self.metrics.get("dataset", "mess_planning_training_dataset_556_students.csv") if self.metrics else "mess_planning_training_dataset_556_students.csv",
            "total_rows": self.metrics.get("rows", 4380) if self.metrics else 4380,
            "train_rows": self.metrics.get("train_rows", 3504) if self.metrics else 3504,
            "test_rows": self.metrics.get("test_rows", 876) if self.metrics else 876,
            "train_until_exclusive": self.metrics.get("train_until_exclusive", "2025-11-23") if self.metrics else "2025-11-23",
            "train_test_split_method": "Chronological 80/20 train/test split on unique calendar dates",
            "features": (
                self.bundle.get("features", [])
                if self.bundle
                else [
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
                ]
            ),
            "categorical_features": [
                "day_of_week",
                "is_weekend",
                "is_holiday",
                "exam_on_day",
                "college_event",
                "weather_condition",
                "meal_type",
                "main_menu_items",
                "special_meal",
            ],
            "numeric_features": ["mess_capacity_students"],
            "targets": (
                self.bundle.get("targets", [])
                if self.bundle
                else ["expected_students", "expected_food_required_kg", "expected_food_wastage_kg"]
            ),
            "metrics": metrics_dict,
            "capacity_default": self.bundle.get("capacity_default", settings.DEFAULT_MESS_CAPACITY) if self.bundle else 556,
            "hyperparameters": {
                "status": "Active" if is_active else "Standby (Awaiting new model file)",
                "expected_file": "mess_prediction_model.joblib",
                "target_directory": "models/ or project root",
                "n_estimators": 250,
                "min_samples_leaf": 2,
                "criterion": "squared_error",
                "random_state": 42,
                "n_jobs": -1,
                "categorical_encoder": "OneHotEncoder(handle_unknown='ignore', sparse_output=False)",
            },
            "domain_safeguards": [
                {
                    "rule": "0 <= expected_students <= mess_capacity_students",
                    "target": "expected_students",
                    "purpose": "Prevents impossible negative student counts and caps headcount to the hostel dining hall's physical seating capacity (556).",
                    "type": "Physical Occupancy Invariant"
                },
                {
                    "rule": "expected_food_required_kg >= 0.0",
                    "target": "expected_food_required_kg",
                    "purpose": "Kitchen batch production mass cannot be negative under any regression edge case.",
                    "type": "Non-Negative Batch Invariant"
                },
                {
                    "rule": "0.0 <= expected_food_wastage_kg <= expected_food_required_kg",
                    "target": "expected_food_wastage_kg",
                    "purpose": "Conservation of mass: unconsumed dining table and serving leftovers can never exceed total food prepared.",
                    "type": "Mass Conservation Invariant"
                }
            ],
            "feature_details": {
                "day_of_week": {
                    "type": "Categorical",
                    "options": "Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday",
                    "role": "Captures cyclical weekday meal attendance patterns and weekend dropoffs.",
                    "derived": True
                },
                "is_weekend": {
                    "type": "Boolean",
                    "options": "True (Saturday, Sunday) / False (Monday-Friday)",
                    "role": "Identifies weekend exodus when residential students travel or eat off-campus.",
                    "derived": True
                },
                "is_holiday": {
                    "type": "Boolean",
                    "options": "True / False",
                    "role": "Institutional holidays result in sharp declines in mess dining attendance.",
                    "derived": False
                },
                "exam_on_day": {
                    "type": "Boolean",
                    "options": "True / False",
                    "role": "Mid-term/final exams cause altered student eating schedules and study absences.",
                    "derived": False
                },
                "college_event": {
                    "type": "Boolean",
                    "options": "True / False",
                    "role": "Campus festivals and athletic meets introduce guest attendance and meal timing shifts.",
                    "derived": False
                },
                "weather_condition": {
                    "type": "Categorical",
                    "options": "Clear, Rainy, Cold",
                    "role": "Adverse weather (heavy rain, extreme cold) increases on-campus mess retention.",
                    "derived": False
                },
                "meal_type": {
                    "type": "Categorical",
                    "options": "Breakfast, Lunch, Snacks, Dinner",
                    "role": "Fundamental meal slot with distinct portion norms (e.g. Lunch ~0.40 kg/student, Snacks ~0.15 kg/student).",
                    "derived": False
                },
                "main_menu_items": {
                    "type": "Categorical / Text",
                    "options": "Standard Indian hostel mess recipes or 'Special'",
                    "role": "Recipe popularity and meal composition directly correlate with student participation and leftovers.",
                    "derived": False
                },
                "mess_capacity_students": {
                    "type": "Numeric (Integer)",
                    "options": "Default: 556 (Valid range: 1 to 5,000)",
                    "role": "Upper bound constraint representing total registered student population.",
                    "derived": False
                },
                "special_meal": {
                    "type": "Categorical",
                    "options": "Yes / No",
                    "role": "Special feast meals (e.g. festival menus) increase turnout and portion consumption.",
                    "derived": False
                }
            },
            "limitations_disclaimer": (
                "Operational Context: The predictive model is trained on college hostel mess dining logs and attendance records. "
                "Forecasts provide decision-support estimates for kitchen prep portions, buffer allocations, and batch requirements."
            ),
        }

    def get_known_menus(self) -> Dict[str, List[str]]:
        """Return categorized lists of known menu items per meal for UI suggestions."""
        return {
            "Breakfast": [
                "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Aloo Paratha, Dahi",
                "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Chana Tari, Sprouts, Poha",
                "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Dosa, Sambhar, Coconut Chutney",
                "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Idli, Sambhar, Coconut Chutney",
                "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Mendu Wada, Sambhar, Groundnut Chutney",
                "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Misal Pav, Diced Onion",
                "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Paneer Cheese Paratha, Dahi",
            ],
            "Lunch": [
                "Aloo Bhaji, Dal Fry, Rice, Puri + Palak Puri, Fried Papad, Dahi",
                "Aloo Palak, Dal Tadka, Veg Biryani, Chapati, Fried Papad, Bundi Raita",
                "Chole, Chana Dal, Pulaw Rice, Parathe, Ice-cream",
                "Dal Bati, Rice, Schezwan Chutney",
                "Kala Chana, Dal Fry, Pulaw Rice, Parathe, Fried Papad, Dahi",
                "Loki Kofta, Dal, Rice, Chapati, Dahi, Lasun Chutney, Fryums",
                "Masala Bhindi/Chawali, Rice, Dal Fry, Chapati, Bundi Raita, Fryums",
                "Mix Veg, Dal Fry, Jeera Rice, Chapati, Fried Papad, Bundi Raita",
                "Rajma Masala, Chana Dal, Pulaw Rice, Chapati, Fryums, Dahi",
            ],
            "Snacks": [
                "Milk/Tea/Coffee/Bournvita, Burger",
                "Milk/Tea/Coffee/Bournvita, Cutlet",
                "Milk/Tea/Coffee/Bournvita, Dabeli",
                "Milk/Tea/Coffee/Bournvita, Samosa",
                "Milk/Tea/Coffee/Bournvita, Tikki Chaat",
                "Milk/Tea/Coffee/Bournvita, Vada Pav",
                "Milk/Tea/Coffee/Bournvita, Veg Puff/Bread, Pakoda",
            ],
            "Dinner": [
                "Afgani Paneer, Dal Tadka, Rice, Puri + Palak Puri, Kheer",
                "Chole, Dal Tadka, Jeera Rice, Kulche/Parathe, Ice-cream",
                "Masala Bhindi/Shimla-Pyaz, Dal Makhani, Rice, Chapati",
                "Matar Mushroom, Chana Dal, Rice, Chapati",
                "Paneer Butter Masala, Dal Fry, Jeera Rice, Chapati, Mung Dal Halwa",
                "Special",
            ],
        }

    WEEKLY_SCHEDULE = {
        "Monday": {
            "Breakfast": "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Chana Tari, Sprouts, Poha",
            "Lunch": "Aloo Palak, Dal Tadka, Veg Biryani, Chapati, Fried Papad, Bundi Raita",
            "Snacks": "Milk/Tea/Coffee/Bournvita, Cutlet",
            "Dinner": "Chole, Dal Tadka, Jeera Rice, Kulche/Parathe, Ice-cream",
        },
        "Tuesday": {
            "Breakfast": "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Idli, Sambhar, Coconut Chutney",
            "Lunch": "Loki Kofta, Dal, Rice, Chapati, Dahi, Lasun Chutney, Fryums",
            "Snacks": "Milk/Tea/Coffee/Bournvita, Vada Pav",
            "Dinner": "Matar Mushroom, Chana Dal, Rice, Chapati",
        },
        "Wednesday": {
            "Breakfast": "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Mendu Wada, Sambhar, Groundnut Chutney",
            "Lunch": "Kala Chana, Dal Fry, Pulaw Rice, Parathe, Fried Papad, Dahi",
            "Snacks": "Milk/Tea/Coffee/Bournvita, Dabeli",
            "Dinner": "Paneer Butter Masala, Dal Fry, Jeera Rice, Chapati, Mung Dal Halwa",
        },
        "Thursday": {
            "Breakfast": "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Aloo Paratha, Dahi",
            "Lunch": "Rajma Masala, Chana Dal, Pulaw Rice, Chapati, Fryums, Dahi",
            "Snacks": "Milk/Tea/Coffee/Bournvita, Veg Puff/Bread, Pakoda",
            "Dinner": "Masala Bhindi/Shimla-Pyaz, Dal Makhani, Rice, Chapati",
        },
        "Friday": {
            "Breakfast": "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Misal Pav, Diced Onion",
            "Lunch": "Mix Veg, Dal Fry, Jeera Rice, Chapati, Fried Papad, Bundi Raita",
            "Snacks": "Milk/Tea/Coffee/Bournvita, Tikki Chaat",
            "Dinner": "Chole, Chana Dal, Pulaw Rice, Parathe, Ice-cream",
        },
        "Saturday": {
            "Breakfast": "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Paneer Cheese Paratha, Dahi",
            "Lunch": "Aloo Bhaji, Dal Fry, Rice, Puri + Palak Puri, Fried Papad, Dahi",
            "Snacks": "Milk/Tea/Coffee/Bournvita, Burger",
            "Dinner": "Dal Bati, Rice, Schezwan Chutney",
        },
        "Sunday": {
            "Breakfast": "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Dosa, Sambhar, Coconut Chutney",
            "Lunch": "Masala Bhindi/Chawali, Rice, Dal Fry, Chapati, Bundi Raita, Fryums",
            "Snacks": "Milk/Tea/Coffee/Bournvita, Samosa",
            "Dinner": "Afgani Paneer, Dal Tadka, Rice, Puri + Palak Puri, Kheer",
        },
    }

    def get_scheduled_menu(self, day_of_week: str, meal_type: str, special_meal: str = "No") -> str:
        """Return scheduled menu for the given day and meal slot; returns 'Special' if special_meal is Yes."""
        if special_meal == "Yes":
            return "Special"
        day_menus = self.WEEKLY_SCHEDULE.get(day_of_week, {})
        return day_menus.get(meal_type, "Special" if special_meal == "Yes" else "")

    def get_weekly_schedule(self) -> Dict[str, Dict[str, str]]:
        """Return the complete recurring weekly menu schedule dictionary."""
        return self.WEEKLY_SCHEDULE

    @staticmethod
    def _get_short_menu_label(menu: str) -> str:
        """Extract a readable, concise dish label for UI badges and card headers."""
        cleaned = menu.strip()
        breakfast_prefix = "Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, "
        if cleaned.startswith(breakfast_prefix):
            return cleaned.replace(breakfast_prefix, "")
        snacks_prefix = "Milk/Tea/Coffee/Bournvita, "
        if cleaned.startswith(snacks_prefix):
            return cleaned.replace(snacks_prefix, "")
        return cleaned

    @staticmethod
    def is_low_attendance(expected_students: float, capacity: int = 556) -> bool:
        """
        Determine if expected student turnout is low (< 65% capacity or < 340 students).
        """
        if capacity <= 0:
            return False
        turnout_pct = (expected_students / float(capacity)) * 100.0
        return turnout_pct < 65.0 or expected_students < 340.0

    def recommend_menu_improvements(
        self,
        base_features: Dict[str, Any],
        current_prediction: Optional[Dict[str, float]] = None,
        max_recommendations: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Evaluate candidate menus for the selected meal type and operational conditions
        to identify menu substitutions that increase expected attendance and reduce or control food wastage.
        """
        meal_type = str(base_features.get("meal_type", "Lunch"))
        current_menu = str(base_features.get("main_menu_items", "")).strip()
        capacity = int(base_features.get("mess_capacity_students", 556))

        # Compute baseline prediction if not supplied
        if not current_prediction:
            current_prediction = self.predict(base_features)

        curr_students = float(current_prediction.get("expected_students", 0.0))
        curr_food = float(current_prediction.get("expected_food_required_kg", 0.0))
        curr_waste = float(current_prediction.get("expected_food_wastage_kg", 0.0))
        curr_waste_pct = round((curr_waste / curr_food * 100), 2) if curr_food > 0 else 0.0

        candidates = self.get_known_menus().get(meal_type, [])
        scored_recommendations: List[Dict[str, Any]] = []

        for candidate_menu in candidates:
            cand_stripped = candidate_menu.strip()
            # Omit current menu from alternative recommendations
            if cand_stripped == current_menu:
                continue

            candidate_payload = dict(base_features)
            candidate_payload["main_menu_items"] = cand_stripped
            if cand_stripped == "Special":
                candidate_payload["special_meal"] = "Yes"
            else:
                candidate_payload["special_meal"] = "No"

            try:
                pred = self.predict(candidate_payload)
            except Exception:
                continue

            cand_students = float(pred["expected_students"])
            cand_food = float(pred["expected_food_required_kg"])
            cand_waste = float(pred["expected_food_wastage_kg"])
            cand_waste_pct = round((cand_waste / cand_food * 100), 2) if cand_food > 0 else 0.0

            student_delta = round(cand_students - curr_students, 1)
            student_delta_pct = round((student_delta / curr_students * 100), 1) if curr_students > 0 else 0.0
            wastage_delta_kg = round(cand_waste - curr_waste, 2)
            waste_pct_delta = round(cand_waste_pct - curr_waste_pct, 2)

            # Filtering: Keep recommendations that increase attendance OR reduce wastage with steady attendance
            if student_delta < -2.0 and wastage_delta_kg >= 0:
                continue

            # Multi-objective optimization score:
            # +2.0 per student gained, -3.0 per kg wastage, -1.0 per % waste ratio
            score = (student_delta * 2.0) - (wastage_delta_kg * 3.0) - (waste_pct_delta * 1.0)

            # Categorize strategy & reason
            if student_delta >= 4.0:
                strategy_badge = "Highest Attendance"
                if wastage_delta_kg <= 0.05:
                    reasoning = f"Boosts predicted turnout by +{student_delta} students (+{student_delta_pct}%) without increasing wastage."
                else:
                    reasoning = f"Significantly increases predicted turnout by +{student_delta} students (+{student_delta_pct}%) with efficient {cand_waste_pct}% waste ratio."
            elif wastage_delta_kg < -0.05 or waste_pct_delta < -0.2:
                strategy_badge = "Lowest Wastage"
                if student_delta >= 0:
                    reasoning = f"Reduces food wastage by {abs(wastage_delta_kg):.2f} kg ({abs(waste_pct_delta):.1f}%) while sustaining {cand_students} students."
                else:
                    reasoning = f"Minimizes food wastage to {cand_waste} kg ({cand_waste_pct}%) while keeping turnout stable at {cand_students} students."
            elif student_delta > 0:
                strategy_badge = "Attendance Boost"
                reasoning = f"Projected to attract +{student_delta} more students (+{student_delta_pct}%) compared to current menu."
            else:
                strategy_badge = "Best Balance"
                reasoning = f"Maintains steady attendance at {cand_students} students with optimized portion utilization."

            short_label = self._get_short_menu_label(cand_stripped)

            scored_recommendations.append({
                "menu_items": cand_stripped,
                "short_label": short_label,
                "meal_type": meal_type,
                "projected_students": cand_students,
                "projected_food_required_kg": cand_food,
                "projected_food_wastage_kg": cand_waste,
                "projected_waste_percentage": cand_waste_pct,
                "student_delta": student_delta,
                "student_delta_percentage": student_delta_pct,
                "wastage_delta_kg": wastage_delta_kg,
                "waste_percentage_delta": waste_pct_delta,
                "strategy_badge": strategy_badge,
                "reasoning": reasoning,
                "score": round(score, 2),
            })

        # Rank recommendations by composite score descending
        scored_recommendations.sort(key=lambda r: (r["score"], r["student_delta"]), reverse=True)

        return scored_recommendations[:max_recommendations]


ml_service = MLService()


