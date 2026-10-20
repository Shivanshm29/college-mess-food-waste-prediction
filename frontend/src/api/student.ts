import { apiClient } from './client';
import {
  MealFeedbackPayload,
  MealFeedbackRecord,
  MealIntention,
  SaveIntentionPayload,
  ScheduleResponse,
  StudentDashboardData,
  StudentNotification,
  StudentProfileUpdatePayload,
} from '../types/student';
import { User } from '../types';

export const studentApi = {
  getDashboard: () => apiClient<StudentDashboardData>('/student/dashboard'),

  getSchedule: (params?: { start_date?: string; days?: number }) =>
    apiClient<ScheduleResponse>('/student/schedule', { params }),

  saveIntention: (payload: SaveIntentionPayload) =>
    apiClient<MealIntention>('/student/intentions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  withdrawIntention: (intentionId: number) =>
    apiClient<{ message: string }>(`/student/intentions/${intentionId}`, {
      method: 'DELETE',
    }),

  getIntentions: (params?: { meal_type?: string; period?: 'upcoming' | 'past' | 'all' }) =>
    apiClient<MealIntention[]>('/student/intentions', { params }),

  submitFeedback: (payload: MealFeedbackPayload) =>
    apiClient<MealFeedbackRecord>('/student/feedback', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getFeedbacks: () => apiClient<MealFeedbackRecord[]>('/student/feedback'),

  getNotifications: () => apiClient<StudentNotification[]>('/student/notifications'),

  markNotificationRead: (notificationId: number) =>
    apiClient<{ message: string }>(`/student/notifications/${notificationId}/read`, {
      method: 'PUT',
    }),

  updateProfile: (payload: StudentProfileUpdatePayload) =>
    apiClient<User>('/student/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
