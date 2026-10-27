import { describe, it, expect } from 'vitest';
import {
  DEFAULT_MESS_CAPACITY,
  validateAttendance,
  validateFoodQuantity,
  calculateSpecialMealTarget,
} from '../utils/validation';

describe('Frontend HCI Validation Suite (Rule 5: Prevent Errors)', () => {
  describe('Attendance validation', () => {
    it('accepts valid integers within capacity 556', () => {
      expect(validateAttendance(0).isValid).toBe(true);
      expect(validateAttendance(0).value).toBe(0);

      expect(validateAttendance(100).isValid).toBe(true);
      expect(validateAttendance(100).value).toBe(100);

      expect(validateAttendance(523).isValid).toBe(true);
      expect(validateAttendance(523).value).toBe(523);

      expect(validateAttendance(556).isValid).toBe(true);
      expect(validateAttendance(556).value).toBe(556);
      expect(validateAttendance(DEFAULT_MESS_CAPACITY).value).toBe(556);
    });

    it('parses valid numeric strings', () => {
      const res = validateAttendance(' 450 ');
      expect(res.isValid).toBe(true);
      expect(res.value).toBe(450);
    });

    it('rejects negative attendance', () => {
      const res = validateAttendance(-1);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/cannot be negative/i);
    });

    it('rejects fractional attendance (e.g. 556.5)', () => {
      const res = validateAttendance(556.5);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/must be a whole number/i);
    });

    it('rejects attendance exceeding mess capacity of 556 without silent clamping', () => {
      const res557 = validateAttendance(557);
      expect(res557.isValid).toBe(false);
      expect(res557.error).toMatch(/exceeds maximum/i);
      expect(res557.error).toContain('556');
      // Ensure it does not silently return 556
      expect(res557.value).toBeUndefined();

      const res600 = validateAttendance(600);
      expect(res600.isValid).toBe(false);
      expect(res600.error).toMatch(/exceeds maximum/i);
    });

    it('rejects non-numeric text and empty inputs', () => {
      expect(validateAttendance('').isValid).toBe(false);
      expect(validateAttendance('abc').isValid).toBe(false);
      expect(validateAttendance('five').error).toMatch(/must be a valid whole number/i);
    });
  });

  describe('Special-meal operational target calculation', () => {
    it('calculates target as ceil(0.94 * 556) = 523 students', () => {
      const target = calculateSpecialMealTarget(556);
      expect(target).toBe(523);
      expect(target).toBe(Math.ceil(0.94 * 556));
    });

    it('calculates target for custom capacities', () => {
      expect(calculateSpecialMealTarget(100)).toBe(94);
      expect(calculateSpecialMealTarget(50)).toBe(47);
    });
  });

  describe('Food quantity validation', () => {
    it('accepts valid non-negative numbers in kilograms', () => {
      expect(validateFoodQuantity(0).isValid).toBe(true);
      expect(validateFoodQuantity(0).value).toBe(0);

      expect(validateFoodQuantity(145.5).isValid).toBe(true);
      expect(validateFoodQuantity(145.5).value).toBe(145.5);

      expect(validateFoodQuantity('120.75').isValid).toBe(true);
      expect(validateFoodQuantity('120.75').value).toBe(120.75);
    });

    it('rejects negative food quantities', () => {
      const res = validateFoodQuantity(-5);
      expect(res.isValid).toBe(false);
      expect(res.error).toMatch(/cannot be negative/i);
    });

    it('rejects non-finite and invalid inputs', () => {
      expect(validateFoodQuantity(NaN).isValid).toBe(false);
      expect(validateFoodQuantity(Infinity).isValid).toBe(false);
      expect(validateFoodQuantity('ten kg').isValid).toBe(false);
    });
  });
});
