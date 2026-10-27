/**
 * HCI Validation Helpers for College Mess Planning & Food Waste Prediction System.
 *
 * Implements Shneiderman's Golden Rule 5 (Prevent Errors):
 * - Validates student attendance against mess capacity (default 556 students).
 * - Attendance must be a non-negative whole number (rejects -1, 556.5, 600, or text).
 * - NEVER silently clamps invalid attendance to 556; displays clear descriptive error.
 * - Enforces special meal operational target (ceil(0.94 * capacity) = 523 for 556 capacity).
 * - Validates food quantities in kilograms (finite, non-negative numbers).
 */

export const DEFAULT_MESS_CAPACITY = 556;
export const SPECIAL_MEAL_CAPACITY_RATIO = 0.94;

export interface ValidationResult<T> {
  isValid: boolean;
  value?: T;
  error?: string;
}

/**
 * Validate attendance against configured capacity:
 * - Must be non-negative whole number.
 * - Attendance must not exceed configured capacity (default 556).
 * - Does NOT silently clamp invalid attendance.
 */
export function validateAttendance(
  val: unknown,
  maxCapacity: number = DEFAULT_MESS_CAPACITY,
  fieldName: string = 'Attendance'
): ValidationResult<number> {
  if (val === null || val === undefined || val === '') {
    return { isValid: false, error: `${fieldName} is required.` };
  }

  if (typeof val === 'boolean') {
    return { isValid: false, error: `${fieldName} must be a whole number, not a boolean.` };
  }

  const num = Number(val);
  if (isNaN(num)) {
    return { isValid: false, error: `${fieldName} must be a valid whole number of students.` };
  }

  if (!Number.isInteger(num)) {
    return {
      isValid: false,
      error: `${fieldName} must be a whole number of students. Decimal numbers (${num}) are not permitted for headcounts.`,
    };
  }

  if (num < 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be negative. Received: ${num} students.`,
    };
  }

  if (num > maxCapacity) {
    return {
      isValid: false,
      error: `${fieldName} (${num} students) exceeds maximum dining hall capacity of ${maxCapacity} students. Physical occupancy cannot exceed ${maxCapacity}.`,
    };
  }

  return { isValid: true, value: num };
}

/**
 * Validate food quantity in kilograms (kg):
 * - Must be finite, non-negative number.
 * - Rejects negative quantities, NaN, and infinity.
 */
export function validateFoodQuantity(
  val: unknown,
  fieldName: string = 'Food quantity'
): ValidationResult<number> {
  if (val === null || val === undefined || val === '') {
    return { isValid: false, error: `${fieldName} is required.` };
  }

  if (typeof val === 'boolean') {
    return { isValid: false, error: `${fieldName} must be a number in kg, not a boolean.` };
  }

  const num = Number(val);
  if (isNaN(num) || !isFinite(num)) {
    return { isValid: false, error: `${fieldName} must be a valid finite number in kilograms (kg).` };
  }

  if (num < 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be negative. Received: ${num} kg. Quantities must be zero or positive.`,
    };
  }

  return { isValid: true, value: Math.round(num * 100) / 100 };
}

/**
 * Calculate special meal attendance target:
 * Target is at least 94% of configured capacity, rounded up:
 * ceil(0.94 * 556) = 523 students.
 */
export function calculateSpecialMealTarget(
  capacity: number = DEFAULT_MESS_CAPACITY
): number {
  const target = Math.ceil(SPECIAL_MEAL_CAPACITY_RATIO * capacity);
  return Math.min(capacity, target);
}
