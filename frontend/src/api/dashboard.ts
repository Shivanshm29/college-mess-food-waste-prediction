import { apiClient } from './client';
import { DashboardSummary } from '../types';

export const dashboardApi = {
  getSummary: () => apiClient<DashboardSummary>('/dashboard/summary'),
};
