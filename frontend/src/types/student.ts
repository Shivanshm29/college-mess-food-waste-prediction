import { MealType } from './index';

export type IntentionChoice = 'likely' | 'unlikely' | 'unsure';

export interface MealIntention {
  id: number;
  user_id: number;
  date: string;
  meal_type: MealType;
  status: IntentionChoice;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentMealItem {
  meal_type: MealType;
  time_window: string;
  cutoff_time: string;
  cutoff_iso?: string | null;
  is_closed: boolean;
  closure_reason?: string | null;
  menu_items: string;
  category: string;
  current_intention?: MealIntention | null;
}

export interface UpcomingMealSummary {
  date: string;
  day_name: string;
  meal_type: MealType;
  time_window: string;
  cutoff_time: string;
  menu_items: string;
  category: string;
  intention_status?: IntentionChoice | null;
}

export interface StudentNotification {
  id: number;
  title: string;
  message: string;
  category: 'announcement' | 'menu_change' | 'reminder' | string;
  is_read: boolean;
  created_at: string;
}

export interface StudentDashboardData {
  today_date: string;
  today_day_name: string;
  student_name: string;
  hostel_block: string;
  room_number: string;
  dietary_preference: string;
  today_meals: StudentMealItem[];
  upcoming_meals: UpcomingMealSummary[];
  recent_intentions: MealIntention[];
  announcements: StudentNotification[];
  pending_responses_count: number;
}

export interface ScheduleDay {
  date: string;
  day_name: string;
  is_today: boolean;
  meals: StudentMealItem[];
}

export interface ScheduleResponse {
  days: ScheduleDay[];
}

export interface SaveIntentionPayload {
  date: string;
  meal_type: MealType;
  status: IntentionChoice;
  notes?: string | null;
}

export interface MealFeedbackPayload {
  date: string;
  meal_type: MealType;
  satisfaction_rating: number; // 1 to 5
  taste_rating: number; // 1 to 5
  portion_size_rating: 'Too small' | 'Just right' | 'Too large';
  comments?: string | null;
  is_anonymous: boolean;
}

export interface MealFeedbackRecord extends MealFeedbackPayload {
  id: number;
  user_id: number;
  created_at: string;
}

export interface StudentProfileUpdatePayload {
  full_name?: string;
  email?: string;
  hostel_block?: string;
  room_number?: string;
  dietary_preference?: 'Vegetarian' | 'Non-Vegetarian' | 'Jain';
  reminder_cutoff_hours?: number;
}
