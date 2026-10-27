import { MealType, NextAvailableMealFeatures, SpecialMealType } from '../types';
import { getAutoDecidedMenu } from './menuSchedule';

/**
 * Shneiderman's Golden Rule 7: Enable Frequent Users to Use Shortcuts
 * Automatically calculates the next upcoming dining meal slot for the mess manager
 * and pre-populates all 10 prediction input features (Date, Meal Type, Menu Items,
 * Special Meal Flag, Capacity, Holiday, Exam, Event, Weather, and Notes).
 *
 * Operational schedule windows:
 * - Breakfast: 07:30 - 09:30 (Cutoff 06:30; planning window before 09:30)
 * - Lunch: 12:30 - 14:30 (Cutoff 11:00; planning window 09:30 - 14:30)
 * - Snacks: 16:30 - 18:00 (planning window 14:30 - 17:30)
 * - Dinner: 19:30 - 21:30 (Cutoff 18:00; planning window 17:30 - 21:30)
 * - After 21:30: Breakfast of the following morning
 */
export function determineNextAvailableMeal(refDate: Date = new Date()): NextAvailableMealFeatures {
  const currentHour = refDate.getHours();
  const currentMinute = refDate.getMinutes();
  const timeVal = currentHour + currentMinute / 60.0;

  const targetDate = new Date(refDate);
  let isTomorrow = false;
  let mealType: MealType = 'Breakfast';
  let timeWindow = '7:30 AM - 9:30 AM';

  if (timeVal < 9.5) {
    // Before 9:30 AM -> Today's Breakfast
    mealType = 'Breakfast';
    timeWindow = '7:30 AM - 9:30 AM';
  } else if (timeVal < 14.5) {
    // 9:30 AM to 2:30 PM -> Today's Lunch
    mealType = 'Lunch';
    timeWindow = '12:30 PM - 2:30 PM';
  } else if (timeVal < 17.5) {
    // 2:30 PM to 5:30 PM -> Today's Snacks
    mealType = 'Snacks';
    timeWindow = '4:30 PM - 6:00 PM';
  } else if (timeVal < 21.5) {
    // 5:30 PM to 9:30 PM -> Today's Dinner
    mealType = 'Dinner';
    timeWindow = '7:30 PM - 9:30 PM';
  } else {
    // After 9:30 PM -> Tomorrow's Breakfast
    targetDate.setDate(targetDate.getDate() + 1);
    isTomorrow = true;
    mealType = 'Breakfast';
    timeWindow = '7:30 AM - 9:30 AM';
  }

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const daysList = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = daysList[targetDate.getDay()];
  const isSunday = targetDate.getDay() === 0;

  // Sunday Dinner is designated special meal feast in mess system
  const isSpecial: SpecialMealType = isSunday && mealType === 'Dinner' ? 'Yes' : 'No';
  const menu = getAutoDecidedMenu(dayName, mealType, isSpecial);

  const label = isTomorrow ? `Tomorrow's ${mealType}` : `Today's ${mealType}`;
  const desc = `Next scheduled dining service is ${label} (${timeWindow}) on ${dayName}, ${dateStr}.`;

  return {
    date: dateStr,
    day_of_week: dayName,
    is_tomorrow: isTomorrow,
    meal_type: mealType,
    main_menu_items: menu,
    special_meal: isSpecial,
    mess_capacity_students: 556,
    is_holiday: isSunday,
    exam_on_day: false,
    college_event: false,
    weather_condition: 'Clear',
    notes: `Auto-filled shortcut for ${label} (${dayName}, ${dateStr})`,
    time_window: timeWindow,
    label,
    description: desc,
  };
}
