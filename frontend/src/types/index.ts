export type Role = 'manager' | 'admin' | 'staff' | 'student';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name?: string | null;
  role: Role;
  is_active: boolean;
  hostel_block?: string | null;
  room_number?: string | null;
  dietary_preference?: string | null;
  reminder_cutoff_hours?: number | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Snacks' | 'Dinner';
export type WeatherType = 'Clear' | 'Cloudy' | 'Hot' | 'Humid' | 'Rainy';
export type SpecialMealType = 'Yes' | 'No';

export interface PredictionInput {
  date: string;
  meal_type: MealType;
  main_menu_items: string;
  special_meal: SpecialMealType;
  mess_capacity_students: number;
  is_holiday: boolean;
  exam_on_day: boolean;
  college_event: boolean;
  weather_condition: WeatherType;
  notes?: string | null;
}

export interface MenuRecommendation {
  menu_items: string;
  short_label: string;
  meal_type: MealType;
  projected_students: number;
  projected_food_required_kg: number;
  projected_food_wastage_kg: number;
  projected_waste_percentage: number;
  student_delta: number;
  student_delta_percentage: number;
  wastage_delta_kg: number;
  waste_percentage_delta: number;
  strategy_badge: string;
  reasoning: string;
  score: number;
}

export interface MenuRecommendationRequest {
  date: string;
  meal_type: MealType;
  main_menu_items?: string;
  special_meal?: SpecialMealType;
  mess_capacity_students?: number;
  is_holiday?: boolean;
  exam_on_day?: boolean;
  college_event?: boolean;
  weather_condition?: WeatherType;
}

export interface PredictionRecord extends PredictionInput {
  id: number;
  user_id: number;
  day_of_week: string;
  is_weekend: boolean;
  expected_students: number;
  expected_food_required_kg: number;
  expected_food_wastage_kg: number;
  model_version: string;
  created_at: string;
  waste_percentage?: number;
  food_per_student_kg?: number;
  is_low_turnout?: boolean;
  turnout_percentage?: number;
  menu_recommendations?: MenuRecommendation[];
}

export interface PaginatedPredictions {
  items: PredictionRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface MealWiseStat {
  meal_type: MealType;
  count: number;
  avg_expected_students: number;
  avg_expected_food_kg: number;
  avg_expected_wastage_kg: number;
  avg_waste_percentage: number;
}

export interface DashboardSummary {
  total_predictions: number;
  avg_expected_students: number;
  avg_expected_food_kg: number;
  avg_expected_wastage_kg: number;
  avg_waste_percentage: number;
  recent_predictions: PredictionRecord[];
  meal_wise_summary: MealWiseStat[];
  has_history: boolean;
}

export interface TimelineDataPoint {
  date: string;
  meal_type: string;
  expected_students: number;
  expected_food_required_kg: number;
  expected_food_wastage_kg: number;
  waste_percentage: number;
}

export interface AnalyticsSummary {
  total_records: number;
  total_expected_food_kg: number;
  total_expected_wastage_kg: number;
  overall_waste_percentage: number;
  by_meal: MealWiseStat[];
  timeline: TimelineDataPoint[];
  has_history: boolean;
}

export interface ModelMetricTarget {
  MAE: number;
  RMSE: number;
  R2: number;
  actual_test_mean?: number;
  predicted_test_mean?: number;
}

export interface FeatureDetail {
  type: string;
  options: string;
  role: string;
  derived: boolean;
}

export interface DomainSafeguard {
  rule: string;
  target: string;
  purpose: string;
  type: string;
}

export interface ModelInfo {
  model_version: string;
  algorithm: string;
  dataset_name: string;
  total_rows: number;
  train_rows: number;
  test_rows: number;
  train_until_exclusive?: string;
  train_test_split_method: string;
  features: string[];
  categorical_features: string[];
  numeric_features: string[];
  targets: string[];
  metrics: Record<string, ModelMetricTarget>;
  capacity_default: number;
  limitations_disclaimer: string;
  hyperparameters?: Record<string, any>;
  domain_safeguards?: DomainSafeguard[];
  feature_details?: Record<string, FeatureDetail>;
}

export interface ModelPreviewResponse {
  expected_students: number;
  expected_food_required_kg: number;
  expected_food_wastage_kg: number;
  raw_expected_students: number;
  raw_expected_food_required_kg: number;
  raw_expected_food_wastage_kg: number;
  waste_percentage: number;
  food_per_student_kg: number;
  safeguards_triggered: string[];
}

export interface HealthInfo {
  status: string;
  database_connected: boolean;
  model_loaded: boolean;
  model_version: string;
  version: string;
}

