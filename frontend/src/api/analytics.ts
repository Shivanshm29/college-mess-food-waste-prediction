import { apiClient } from './client';
import { AnalyticsSummary } from '../types';

export const analyticsApi = {
  getSummary: () => apiClient<AnalyticsSummary>('/analytics/summary'),
};
