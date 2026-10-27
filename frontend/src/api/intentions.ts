import { apiClient } from './client';
import { DateIntentionsSummary, PaginatedManagerIntentions, DateMealRosterResponse } from '../types';

export const intentionsApi = {
  getSummary: (dateStr?: string) =>
    apiClient<DateIntentionsSummary>('/intentions/summary', {
      params: dateStr ? { date: dateStr } : undefined,
    }),

  getIntentions: (params?: {
    date?: string;
    meal_type?: string;
    status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) =>
    apiClient<PaginatedManagerIntentions>('/intentions', { params }),

  getRoster: (params?: {
    date?: string;
    meal_type?: string;
    search?: string;
  }) =>
    apiClient<DateMealRosterResponse>('/intentions/roster', { params }),

  exportTrainingDataUrl: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams({ format: 'csv' });
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    return `/api/intentions/export?${params.toString()}`;
  },
};
