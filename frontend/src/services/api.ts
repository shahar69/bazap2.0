import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for token refresh and error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await api.post('/auth/refresh', { token: refreshToken });
          const newAccessToken = response.data.accessToken;
          localStorage.setItem('token', newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    const message = (error.response?.data as any)?.message || (error as any).message || 'שגיאה בתקשורת עם השרת';
    console.error('API Error:', message);
    
    return Promise.reject(new Error(message));
  }
);

// Auth API
export const authApi = {
  login: async (username: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'שגיאה בתהליך ההתחברות';
      throw new Error(errorMessage);
    }
  },
  refresh: async (refreshToken: string) => {
    try {
      const response = await api.post('/auth/refresh', { token: refreshToken });
      return response.data;
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'שגיאה בחידוש הטוקן';
      throw new Error(errorMessage);
    }
  },
};

// Items API
export const itemsApi = {
  getAll: async (includeInactive: boolean = false) => {
    try {
      const response = await api.get('/items', { params: { includeInactive } });
      return response.data;
    } catch (error) {
      console.error('Failed to load items:', error);
      throw error;
    }
  },
  getById: async (id: number) => {
    const response = await api.get(`/items/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/items', data);
    return response.data;
  },
  update: async (id: number, data: any) => {
    const response = await api.put(`/items/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    await api.delete(`/items/${id}`);
  },
};

// Receipts API
export const receiptsApi = {
  getAll: async (filters?: any) => {
    try {
      const response = await api.get('/receipts', { params: filters });
      return response.data;
    } catch (error) {
      console.error('Failed to load receipts:', error);
      throw error;
    }
  },
  getById: async (id: number) => {
    const response = await api.get(`/receipts/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    try {
      const response = await api.post('/receipts', data);
      return response.data;
    } catch (error) {
      console.error('Failed to create receipt:', error);
      throw error;
    }
  },
  delete: async (id: number) => {
    await api.delete(`/receipts/${id}`);
  },
  cancelReceipt: async (id: number, data: { reason: string }) => {
    try {
      const response = await api.post(`/receipts/${id}/cancel`, data);
      return response.data;
    } catch (error) {
      console.error('Failed to cancel receipt:', error);
      throw error;
    }
  },
};

export default api;
