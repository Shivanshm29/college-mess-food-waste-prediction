const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = localStorage.getItem('access_token');

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (response.status === 401) {
    // If unauthorized, clear invalid token
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
  }

  let data: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (data && typeof data === 'object' && (data.detail || data.message)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg), data);
  }

  return data as T;
}
