#!/usr/bin/env python3
"""Train the college mess prediction models using the supplied CSV."""
from pathlib import Path
import json
import numpy as np
import pandas as pd
import joblib
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATA = Path(__file__).with_name("mess_planning_training_dataset_556_students_patterned.csv")
OUT = Path(__file__).with_name("mess_prediction_model.joblib")
METRICS = Path(__file__).with_name("mess_model_metrics.json")
TARGETS = ["expected_students", "expected_food_required_kg", "expected_food_wastage_kg"]
df = pd.read_csv(DATA)
X = df.drop(columns=TARGETS + ["date"])
y = df[TARGETS].apply(pd.to_numeric, errors="raise")
dates = pd.to_datetime(df["date"])
unique_dates = sorted(dates.unique())
cutoff = pd.Timestamp(unique_dates[max(1, int(len(unique_dates) * .8))])
train_mask, test_mask = dates < cutoff, dates >= cutoff
cat = [c for c in X.columns if X[c].dtype == "object" or X[c].dtype == "bool"]
num = [c for c in X.columns if c not in cat]
pre = ColumnTransformer([("cat", OneHotEncoder(handle_unknown="ignore"), cat), ("num", "passthrough", num)])
models, report = {}, {"rows": len(df), "train_rows": int(train_mask.sum()), "test_rows": int(test_mask.sum()), "targets": {}, "note": "Generated labels: metrics are not real-world accuracy."}
for target in TARGETS:
    pipe = Pipeline([("preprocess", pre), ("regressor", ExtraTreesRegressor(n_estimators=250, min_samples_leaf=2, random_state=42, n_jobs=-1))])
    pipe.fit(X.loc[train_mask], y.loc[train_mask, target])
    pred = pipe.predict(X.loc[test_mask])
    report["targets"][target] = {"MAE": float(mean_absolute_error(y.loc[test_mask, target], pred)), "RMSE": float(np.sqrt(mean_squared_error(y.loc[test_mask, target], pred))), "R2": float(r2_score(y.loc[test_mask, target], pred))}
    models[target] = pipe
joblib.dump({"models": models, "features": list(X.columns), "targets": TARGETS, "version": "1.0.0", "capacity_default": 556}, OUT)
METRICS.write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
