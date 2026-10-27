import { apiClient } from './client';
import {
  MenuRecommendation,
  MenuRecommendationRequest,
  NextAvailableMealFeatures,
  PaginatedPredictions,
  PredictionInput,
  PredictionRecord,
} from '../types';

export interface PredictionFilters {
  page?: number;
  page_size?: number;
  meal_type?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export const predictionsApi = {
  create: (payload: PredictionInput) =>
    apiClient<PredictionRecord>('/predictions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getAll: (filters: PredictionFilters = {}) =>
    apiClient<PaginatedPredictions>('/predictions', {
      params: filters as Record<string, string | number | boolean | undefined>,
    }),

  getById: (id: number) => apiClient<PredictionRecord>(`/predictions/${id}`),

  delete: (id: number) =>
    apiClient<{ message: string }>(`/predictions/${id}`, {
      method: 'DELETE',
    }),

  getMenuOptions: () => apiClient<Record<string, string[]>>('/predictions/menu-options'),

  getRecommendations: (payload: MenuRecommendationRequest) =>
    apiClient<MenuRecommendation[]>('/predictions/recommendations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getRecommendationsForId: (id: number) =>
    apiClient<MenuRecommendation[]>(`/predictions/${id}/recommendations`),

  recordActuals: (id: number, payload: { actual_attendance: number; actual_food_prepared_kg: number; actual_food_wasted_kg: number }) =>
    apiClient<PredictionRecord>(`/predictions/${id}/actuals`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getNextMealFeatures: () => apiClient<NextAvailableMealFeatures>('/predictions/next-meal'),
};

