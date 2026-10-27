"""
HCI Validation Service for College Mess Planning & Food Waste Prediction System.

Implements Shneiderman's Golden Rule 5 (Prevent Errors):
- Validates student attendance against physical mess capacity (default 556 students).
- Rejects negative values, non-integer numbers (e.g. 556.5), values exceeding capacity, and non-numeric inputs.
- NEVER silently clamps invalid inputs to 556; raises clear descriptive validation errors.
- Calculates rule-based special meal attendance target (>= 94% capacity, rounded up: 523 for 556 capacity).
- Validates food quantities in kilograms (finite, non-negative numbers).
- Validates calendar dates and supported meal types.
"""

from datetime import date
import math
from typing import Any, Optional
from backend.app.config import settings

SUPPORTED_MEAL_TYPES = ("Breakfast", "Lunch", "Snacks", "Dinner")
SPECIAL_MEAL_CAPACITY_RATIO = 0.94


def validate_attendance(
    val: Any,
    max_capacity: int = settings.DEFAULT_MESS_CAPACITY,
    field_name: str = "Attendance",
) -> Optional[int]:
    """
    Validate attendance count:
    - Must be a non-negative whole number.
    - Attendance must not exceed configured capacity (default 556).
    - Rejects negative values (e.g. -1), fractional values (e.g. 556.5),
      values over capacity (e.g. 600), and invalid non-numeric text.
    - NEVER silently clamps invalid attendance to max capacity.
    """
    if val is None:
        return None

    # Python booleans are instances of int; reject True/False
    if isinstance(val, bool):
        raise ValueError(f"{field_name} must be a whole number, not a boolean.")

    if isinstance(val, float):
        if not val.is_integer():
            raise ValueError(
                f"{field_name} must be a whole number of students. Received decimal value: {val}."
            )
        attendance_int = int(val)
    elif isinstance(val, str):
        stripped = val.strip()
        if not stripped:
            raise ValueError(f"{field_name} cannot be empty.")
        if "." in stripped:
            try:
                f_val = float(stripped)
                if not f_val.is_integer():
                    raise ValueError(
                        f"{field_name} must be a whole number of students. Received decimal value: {stripped}."
                    )
                attendance_int = int(f_val)
            except ValueError as e:
                if "decimal value" in str(e):
                    raise
                raise ValueError(
                    f"Invalid {field_name.lower()} '{stripped}'. Attendance must be a whole number."
                )
        else:
            try:
                attendance_int = int(stripped)
            except ValueError:
                raise ValueError(
                    f"Invalid {field_name.lower()} '{stripped}'. Attendance must be a whole number."
                )
    elif isinstance(val, int):
        attendance_int = val
    else:
        raise ValueError(f"{field_name} must be a whole number.")

    if attendance_int < 0:
        raise ValueError(
            f"{field_name} cannot be negative. Received: {attendance_int} students."
        )

    if attendance_int > max_capacity:
        raise ValueError(
            f"{field_name} ({attendance_int} students) exceeds maximum configured mess capacity of {max_capacity} students. "
            f"Physical hall occupancy cannot exceed {max_capacity}."
        )

    return attendance_int


def validate_food_quantity(
    val: Any,
    field_name: str = "Food quantity",
) -> Optional[float]:
    """
    Validate food quantities in kilograms:
    - Must be finite, non-negative numbers.
    - Rejects negative quantities, NaN, infinity, booleans, and invalid text.
    - Rounds to 2 decimal places for consistent display and storage.
    """
    if val is None:
        return None

    if isinstance(val, bool):
        raise ValueError(f"{field_name} must be a number in kg, not a boolean.")

    try:
        num = float(val)
    except (ValueError, TypeError):
        raise ValueError(f"{field_name} must be a valid number in kilograms (kg).")

    if math.isnan(num) or math.isinf(num):
        raise ValueError(f"{field_name} must be a finite number in kilograms (kg).")

    if num < 0:
        raise ValueError(
            f"{field_name} cannot be negative. Received: {num} kg. Kitchen quantities must be zero or positive."
        )

    return round(num, 2)


def calculate_special_meal_target(
    capacity: int = settings.DEFAULT_MESS_CAPACITY,
) -> int:
    """
    Special-meal operational target rule:
    - The expected attendance target should be at least 94% of the configured capacity, rounded up,
      subject to the maximum capacity.
    - For capacity 556: ceil(0.94 * 556) = ceil(522.64) = 523 students.
    - Resulting minimum target is 523 students, and maximum is 556.
    """
    target = math.ceil(SPECIAL_MEAL_CAPACITY_RATIO * capacity)
    return min(capacity, target)


def validate_meal_type(meal_type: str) -> str:
    """Validate meal type is supported."""
    if meal_type not in SUPPORTED_MEAL_TYPES:
        raise ValueError(
            f"Unsupported meal type '{meal_type}'. Supported meal types are: {', '.join(SUPPORTED_MEAL_TYPES)}."
        )
    return meal_type


def validate_meal_date(date_str: str) -> str:
    """Validate date format and calendar reality."""
    try:
        date.fromisoformat(date_str)
    except ValueError:
        raise ValueError(
            f"Invalid meal date '{date_str}'. Must be a valid calendar date in YYYY-MM-DD format."
        )
    return date_str
