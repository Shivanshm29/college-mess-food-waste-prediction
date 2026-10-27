import { describe, it, expect } from 'vitest';
import { determineNextAvailableMeal } from '../utils/nextMeal';

describe('determineNextAvailableMeal utility', () => {
  it('selects Breakfast for today when time is early morning (< 9:30 AM)', () => {
    // 2026-10-27 (Tuesday) at 08:15 AM
    const morningDate = new Date('2026-10-27T08:15:00');
    const result = determineNextAvailableMeal(morningDate);

    expect(result.date).toBe('2026-10-27');
    expect(result.is_tomorrow).toBe(false);
    expect(result.meal_type).toBe('Breakfast');
    expect(result.label).toBe("Today's Breakfast");
    expect(result.mess_capacity_students).toBe(556);
    expect(result.is_holiday).toBe(false);
    expect(result.special_meal).toBe('No');
    expect(result.main_menu_items).toContain('Idli, Sambhar, Coconut Chutney');
  });

  it('selects Lunch for today when time is mid-day (9:30 AM - 2:30 PM)', () => {
    // 2026-10-27 (Tuesday) at 11:30 AM
    const lunchDate = new Date('2026-10-27T11:30:00');
    const result = determineNextAvailableMeal(lunchDate);

    expect(result.date).toBe('2026-10-27');
    expect(result.is_tomorrow).toBe(false);
    expect(result.meal_type).toBe('Lunch');
    expect(result.label).toBe("Today's Lunch");
    expect(result.main_menu_items).toContain('Loki Kofta');
  });

  it('selects Snacks for today when time is afternoon (2:30 PM - 5:30 PM)', () => {
    // 2026-10-27 (Tuesday) at 03:45 PM
    const snacksDate = new Date('2026-10-27T15:45:00');
    const result = determineNextAvailableMeal(snacksDate);

    expect(result.date).toBe('2026-10-27');
    expect(result.is_tomorrow).toBe(false);
    expect(result.meal_type).toBe('Snacks');
    expect(result.label).toBe("Today's Snacks");
    expect(result.main_menu_items).toContain('Vada Pav');
  });

  it('selects Dinner for today when time is evening (5:30 PM - 9:30 PM)', () => {
    // 2026-10-27 (Tuesday) at 06:45 PM
    const dinnerDate = new Date('2026-10-27T18:45:00');
    const result = determineNextAvailableMeal(dinnerDate);

    expect(result.date).toBe('2026-10-27');
    expect(result.is_tomorrow).toBe(false);
    expect(result.meal_type).toBe('Dinner');
    expect(result.label).toBe("Today's Dinner");
    expect(result.main_menu_items).toContain('Matar Mushroom');
  });

  it('rolls over to Tomorrow Breakfast when dinner has completed (> 9:30 PM)', () => {
    // 2026-10-27 (Tuesday) at 10:15 PM
    const nightDate = new Date('2026-10-27T22:15:00');
    const result = determineNextAvailableMeal(nightDate);

    // Should roll to Wednesday 2026-10-28
    expect(result.date).toBe('2026-10-28');
    expect(result.is_tomorrow).toBe(true);
    expect(result.meal_type).toBe('Breakfast');
    expect(result.day_of_week).toBe('Wednesday');
    expect(result.label).toBe("Tomorrow's Breakfast");
    expect(result.main_menu_items).toContain('Mendu Wada');
  });

  it('identifies Sunday Dinner as special feast meal', () => {
    // 2026-11-01 (Sunday) at 06:00 PM
    const sundayDinner = new Date('2026-11-01T18:00:00');
    const result = determineNextAvailableMeal(sundayDinner);

    expect(result.date).toBe('2026-11-01');
    expect(result.meal_type).toBe('Dinner');
    expect(result.special_meal).toBe('Yes');
    expect(result.main_menu_items).toBe('Special');
    expect(result.is_holiday).toBe(true);
  });
});
