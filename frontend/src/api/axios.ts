import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { storage } from '../utils/storage';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Add interceptors here if needed (e.g. for attaching auth tokens)
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = storage.get<string | null>('token', null);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignore storage errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (token expired/invalid)
      storage.remove('user');
      storage.remove('token');
      // Only redirect if not already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
