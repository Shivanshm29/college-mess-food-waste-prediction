import { MealType } from '../types';

/**
 * Standard recurring weekly mess menu schedule extracted directly from
 * mess_planning_training_dataset_556_students_patterned.csv.
 */
export const WEEKLY_MESS_SCHEDULE: Record<string, Record<MealType, string>> = {
  Monday: {
    Breakfast: 'Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Chana Tari, Sprouts, Poha',
    Lunch: 'Aloo Palak, Dal Tadka, Veg Biryani, Chapati, Fried Papad, Bundi Raita',
    Snacks: 'Milk/Tea/Coffee/Bournvita, Cutlet',
    Dinner: 'Chole, Dal Tadka, Jeera Rice, Kulche/Parathe, Ice-cream',
  },
  Tuesday: {
    Breakfast: 'Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Idli, Sambhar, Coconut Chutney',
    Lunch: 'Loki Kofta, Dal, Rice, Chapati, Dahi, Lasun Chutney, Fryums',
    Snacks: 'Milk/Tea/Coffee/Bournvita, Vada Pav',
    Dinner: 'Matar Mushroom, Chana Dal, Rice, Chapati',
  },
  Wednesday: {
    Breakfast: 'Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Mendu Wada, Sambhar, Groundnut Chutney',
    Lunch: 'Kala Chana, Dal Fry, Pulaw Rice, Parathe, Fried Papad, Dahi',
    Snacks: 'Milk/Tea/Coffee/Bournvita, Dabeli',
    Dinner: 'Paneer Butter Masala, Dal Fry, Jeera Rice, Chapati, Mung Dal Halwa',
  },
  Thursday: {
    Breakfast: 'Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Aloo Paratha, Dahi',
    Lunch: 'Rajma Masala, Chana Dal, Pulaw Rice, Chapati, Fryums, Dahi',
    Snacks: 'Milk/Tea/Coffee/Bournvita, Veg Puff/Bread, Pakoda',
    Dinner: 'Masala Bhindi/Shimla-Pyaz, Dal Makhani, Rice, Chapati',
  },
  Friday: {
    Breakfast: 'Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Misal Pav, Diced Onion',
    Lunch: 'Mix Veg, Dal Fry, Jeera Rice, Chapati, Fried Papad, Bundi Raita',
    Snacks: 'Milk/Tea/Coffee/Bournvita, Tikki Chaat',
    Dinner: 'Chole, Chana Dal, Pulaw Rice, Parathe, Ice-cream',
  },
  Saturday: {
    Breakfast: 'Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Paneer Cheese Paratha, Dahi',
    Lunch: 'Aloo Bhaji, Dal Fry, Rice, Puri + Palak Puri, Fried Papad, Dahi',
    Snacks: 'Milk/Tea/Coffee/Bournvita, Burger',
    Dinner: 'Dal Bati, Rice, Schezwan Chutney',
  },
  Sunday: {
    Breakfast: 'Bread/Butter/Jam, Tea/Coffee, Bournvita, Cornflakes/Fruit, Dosa, Sambhar, Coconut Chutney',
    Lunch: 'Masala Bhindi/Chawali, Rice, Dal Fry, Chapati, Bundi Raita, Fryums',
    Snacks: 'Milk/Tea/Coffee/Bournvita, Samosa',
    Dinner: 'Afgani Paneer, Dal Tadka, Rice, Puri + Palak Puri, Kheer',
  },
};

/**
 * Automatically decides the menu item based on day of week, meal type, and special status.
 * In case of special dinner / special meal, returns 'Special'.
 */
export function getAutoDecidedMenu(
  dayOfWeek: string,
  mealType: MealType,
  specialMeal: 'Yes' | 'No'
): string {
  if (specialMeal === 'Yes') {
    return 'Special';
  }
  const daySchedule = WEEKLY_MESS_SCHEDULE[dayOfWeek];
  if (daySchedule && daySchedule[mealType]) {
    return daySchedule[mealType];
  }
  return '';
}
