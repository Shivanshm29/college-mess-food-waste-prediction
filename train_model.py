#!/usr/bin/env python3
"""
Model training and evaluation script for College Mess Planning & Food Waste Prediction.

Targets:
1. expected_students
2. expected_food_required_kg
3. expected_food_wastage_kg

Features:
- day_of_week
- is_weekend
- is_holiday
- exam_on_day
- college_event
- weather_condition
- meal_type
- main_menu_items
- mess_capacity_students
- special_meal
"""

import argparse
import json
import os
from pathlib import Path
import sys
import numpy as np
import pandas as pd
import joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

TARGETS = [
    "expected_students",
    "expected_food_required_kg",
    "expected_food_wastage_kg",
]

CATEGORICAL_FEATURES = [
    "day_of_week",
    "is_weekend",
    "is_holiday",
    "exam_on_day",
    "college_event",
    "weather_condition",
    "meal_type",
    "main_menu_items",
    "special_meal",
]

NUMERIC_FEATURES = [
    "mess_capacity_students",
]

ALL_FEATURES = CATEGORICAL_FEATURES + NUMERIC_FEATURES


def train(data_path: Path, model_out: Path, metrics_out: Path) -> dict:
    if not data_path.exists():
        raise FileNotFoundError(
            f"Training dataset not found at '{data_path}'. Please provide 'mess_planning_training_dataset_556_students_patterned.csv'."
        )

    print(f"Loading dataset from: {data_path}")
    df = pd.read_csv(data_path)

    # Validate columns
    required_cols = set(ALL_FEATURES + TARGETS + ["date"])
    missing_cols = required_cols - set(df.columns)
    if missing_cols:
        raise ValueError(f"Dataset is missing required columns: {missing_cols}")

    # Ensure proper data types
    X = df[ALL_FEATURES].copy()
    X["is_weekend"] = X["is_weekend"].astype(bool)
    X["is_holiday"] = X["is_holiday"].astype(bool)
    X["exam_on_day"] = X["exam_on_day"].astype(bool)
    X["college_event"] = X["college_event"].astype(bool)
    X["special_meal"] = X["special_meal"].astype(str)
    X["mess_capacity_students"] = pd.to_numeric(X["mess_capacity_students"], errors="coerce").fillna(556).astype(int)

    y = df[TARGETS].apply(pd.to_numeric, errors="raise")

    # Chronological train/test split (80% train, 20% test based on unique sorted dates)
    dates = pd.to_datetime(df["date"])
    unique_dates = sorted(dates.unique())
    cutoff_idx = max(1, int(len(unique_dates) * 0.8))
    cutoff_date = pd.Timestamp(unique_dates[cutoff_idx])

    train_mask = dates < cutoff_date
    test_mask = dates >= cutoff_date

    print(f"Total rows: {len(df)}")
    print(f"Chronological split date: {cutoff_date.strftime('%Y-%m-%d')}")
    print(f"Train rows: {int(train_mask.sum())}, Test rows: {int(test_mask.sum())}")

    preprocessor = ColumnTransformer(
        transformers=[
            ("categorical", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
            ("numeric", "passthrough", NUMERIC_FEATURES),
        ]
    )

    models = {}
    metrics_report = {
        "dataset": data_path.name,
        "rows": int(len(df)),
        "train_rows": int(train_mask.sum()),
        "test_rows": int(test_mask.sum()),
        "train_until_exclusive": cutoff_date.strftime("%Y-%m-%d"),
        "features": ALL_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "targets": {},
        "note": "The labels and context fields in this dataset are generated rule-based estimates. Metrics evaluate fit to these labels, not real-world college performance.",
    }

    for target in TARGETS:
        print(f"Training regressor for '{target}'...")
        pipe = Pipeline(
            [
                ("preprocess", preprocessor),
                (
                    "regressor",
                    ExtraTreesRegressor(
                        n_estimators=250,
                        min_samples_leaf=2,
                        random_state=42,
                        n_jobs=-1,
                    ),
                ),
            ]
        )
        pipe.fit(X.loc[train_mask], y.loc[train_mask, target])
        pred = pipe.predict(X.loc[test_mask])

        y_true = y.loc[test_mask, target]
        mae = float(mean_absolute_error(y_true, pred))
        rmse = float(np.sqrt(mean_squared_error(y_true, pred)))
        r2 = float(r2_score(y_true, pred))

        metrics_report["targets"][target] = {
            "MAE": round(mae, 4),
            "RMSE": round(rmse, 4),
            "R2": round(r2, 4),
            "actual_test_mean": round(float(y_true.mean()), 4),
            "predicted_test_mean": round(float(pred.mean()), 4),
        }
        models[target] = pipe

    # Save bundle
    bundle = {
        "models": models,
        "features": ALL_FEATURES,
        "targets": TARGETS,
        "categorical_features": CATEGORICAL_FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "capacity_default": 556,
        "version": "1.0.0",
        "trained_dataset": data_path.name,
        "label_note": metrics_report["note"],
    }

    model_out.parent.mkdir(parents=True, exist_ok=True)
    metrics_out.parent.mkdir(parents=True, exist_ok=True)

    print(f"Saving model bundle to: {model_out}")
    joblib.dump(bundle, model_out)

    print(f"Saving evaluation metrics to: {metrics_out}")
    metrics_out.write_text(json.dumps(metrics_report, indent=2))

    print("Training and evaluation completed successfully!")
    print(json.dumps(metrics_report, indent=2))
    return metrics_report


def main():
    base_dir = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Train College Mess Prediction Model")
    parser.add_argument(
        "--data",
        type=Path,
        default=base_dir / "mess_planning_training_dataset_556_students_patterned.csv",
        help="Path to training CSV file",
    )
    parser.add_argument(
        "--model-out",
        type=Path,
        default=base_dir / "mess_prediction_model.joblib",
        help="Destination path for trained model bundle",
    )
    parser.add_argument(
        "--metrics-out",
        type=Path,
        default=base_dir / "mess_model_metrics.json",
        help="Destination path for metrics JSON file",
    )

    args = parser.parse_args()

    if not args.data.exists() and args.model_out.exists():
        print(f"Data file '{args.data}' not found, but pre-trained model bundle '{args.model_out}' is available.")
        if args.metrics_out.exists():
            print("Existing metrics report:")
            print(args.metrics_out.read_text())
        return

    train(args.data, args.model_out, args.metrics_out)


if __name__ == "__main__":
    main()
