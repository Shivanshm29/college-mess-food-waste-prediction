"""
Unit tests for HCI domain validation and business rules.

Covers Shneiderman's Golden Rule 5 (Prevent Errors):
- Student attendance capacity bounds (0 to 556)
- Rejection of negative, decimal, and over-capacity numbers (no silent clamping)
- Special meal attendance rule (ceil(0.94 * 556) = 523)
- Food quantity validation in kilograms (finite, non-negative numbers)
- Meal type and date format verification
"""

import math
import pytest
from backend.app.config import settings
from backend.app.validation import (
    calculate_special_meal_target,
    validate_attendance,
    validate_food_quantity,
    validate_meal_date,
    validate_meal_type,
)


class TestAttendanceValidation:
    """Tests for mess capacity (556) and attendance validation."""

    def test_valid_attendance_integer(self):
        assert validate_attendance(0) == 0
        assert validate_attendance(100) == 100
        assert validate_attendance(523) == 523
        assert validate_attendance(556) == 556
        assert validate_attendance(settings.DEFAULT_MESS_CAPACITY) == 556

    def test_valid_attendance_string_and_clean_float(self):
        assert validate_attendance("350") == 350
        assert validate_attendance(" 556 ") == 556
        assert validate_attendance(400.0) == 400
        assert validate_attendance("400.0") == 400

    def test_none_returns_none(self):
        assert validate_attendance(None) is None

    def test_reject_negative_attendance(self):
        with pytest.raises(ValueError, match="cannot be negative"):
            validate_attendance(-1)

        with pytest.raises(ValueError, match="cannot be negative"):
            validate_attendance("-15")

    def test_reject_fractional_attendance(self):
        with pytest.raises(ValueError, match="must be a whole number of students"):
            validate_attendance(556.5)

        with pytest.raises(ValueError, match="must be a whole number of students"):
            validate_attendance("300.25")

    def test_reject_above_capacity_no_silent_clamping(self):
        """Attendance above 556 must be rejected with an error, NEVER clamped to 556."""
        with pytest.raises(ValueError, match="exceeds maximum configured mess capacity of 556"):
            validate_attendance(557)

        with pytest.raises(ValueError, match="exceeds maximum configured mess capacity of 556"):
            validate_attendance(600)

        with pytest.raises(ValueError, match="exceeds maximum configured mess capacity of 556"):
            validate_attendance("1000")

    def test_reject_invalid_text_and_empty(self):
        with pytest.raises(ValueError, match="Attendance cannot be empty"):
            validate_attendance("")

        with pytest.raises(ValueError, match="must be a whole number"):
            validate_attendance("five hundred")

    def test_reject_boolean_types(self):
        with pytest.raises(ValueError, match="must be a whole number, not a boolean"):
            validate_attendance(True)

        with pytest.raises(ValueError, match="must be a whole number, not a boolean"):
            validate_attendance(False)


class TestSpecialMealTarget:
    """Tests for the special meal rule: target >= 94% of capacity, rounded up."""

    def test_special_meal_target_default_capacity(self):
        # 556 capacity: ceil(0.94 * 556) = ceil(522.64) = 523
        target = calculate_special_meal_target(settings.DEFAULT_MESS_CAPACITY)
        assert target == 523
        assert target <= settings.DEFAULT_MESS_CAPACITY
        assert target >= math.ceil(0.94 * 556)

    def test_special_meal_target_custom_capacities(self):
        # 100 capacity: ceil(0.94 * 100) = 94
        assert calculate_special_meal_target(100) == 94
        # 50 capacity: ceil(0.94 * 50) = ceil(47.0) = 47
        assert calculate_special_meal_target(50) == 47


class TestFoodQuantityValidation:
    """Tests for food quantity inputs in kilograms."""

    def test_valid_quantities(self):
        assert validate_food_quantity(0) == 0.0
        assert validate_food_quantity(0.0) == 0.0
        assert validate_food_quantity(145.5) == 145.5
        assert validate_food_quantity("130.25") == 130.25
        # Rounding to 2 decimal places
        assert validate_food_quantity(200.756) == 200.76

    def test_none_returns_none(self):
        assert validate_food_quantity(None) is None

    def test_reject_negative_quantity(self):
        with pytest.raises(ValueError, match="cannot be negative"):
            validate_food_quantity(-1.5)

        with pytest.raises(ValueError, match="cannot be negative"):
            validate_food_quantity("-0.01")

    def test_reject_nan_and_infinity(self):
        with pytest.raises(ValueError, match="must be a finite number"):
            validate_food_quantity(float("nan"))

        with pytest.raises(ValueError, match="must be a finite number"):
            validate_food_quantity(float("inf"))

        with pytest.raises(ValueError, match="must be a finite number"):
            validate_food_quantity(float("-inf"))

    def test_reject_boolean_and_invalid_string(self):
        with pytest.raises(ValueError, match="not a boolean"):
            validate_food_quantity(True)

        with pytest.raises(ValueError, match="valid number in kilograms"):
            validate_food_quantity("fifty kg")


class TestMealTypeAndDateValidation:
    """Tests for meal types and calendar dates."""

    def test_valid_meal_types(self):
        for meal in ("Breakfast", "Lunch", "Snacks", "Dinner"):
            assert validate_meal_type(meal) == meal

    def test_unsupported_meal_type(self):
        with pytest.raises(ValueError, match="Unsupported meal type"):
            validate_meal_type("MidnightSnack")

        with pytest.raises(ValueError, match="Unsupported meal type"):
            validate_meal_type("Brunch")

    def test_valid_date(self):
        assert validate_meal_date("2026-10-26") == "2026-10-26"

    def test_invalid_date(self):
        with pytest.raises(ValueError, match="Invalid meal date"):
            validate_meal_date("not-a-date")

        with pytest.raises(ValueError, match="Invalid meal date"):
            validate_meal_date("2026-02-30")
