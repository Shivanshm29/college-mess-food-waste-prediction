import { apiClient } from './client';
import { HealthInfo, ModelInfo, ModelPreviewResponse, PredictionInput } from '../types';

export const modelApi = {
  getInfo: () => apiClient<ModelInfo>('/model/info'),
  getHealth: () => apiClient<HealthInfo>('/health'),
  preview: (data: PredictionInput) =>
    apiClient<ModelPreviewResponse>('/model/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};


