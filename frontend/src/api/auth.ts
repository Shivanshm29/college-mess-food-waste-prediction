import { apiClient } from './client';
import { AuthResponse, Role, User } from '../types';

export interface LoginPayload {
  username_or_email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  role?: Role;
}

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload: RegisterPayload) =>
    apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getMe: () => apiClient<User>('/auth/me'),

  logout: () =>
    apiClient<{ message: string }>('/auth/logout', {
      method: 'POST',
    }),
};
