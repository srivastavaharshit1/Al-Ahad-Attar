import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { storage } from '../utils/storage';
import { apiCache } from '../utils/cache';

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
  (response) => {
    // Automatically clear frontend API cache on any mutation to products or images
    const method = response.config.method?.toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method!)) {
      const url = response.config.url || '';
      if (url.includes('/products') || url.includes('/images')) {
        apiCache.clear();
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Check if the user had a token (they were logged in)
      const hadToken = !!storage.get<string | null>('token', null);
      
      // Handle unauthorized (token expired/invalid)
      storage.remove('user');
      storage.remove('token');
      
      // Only redirect if they had a token (expired session) and are not already on login
      // This prevents guest checkout from being blindly redirected if an edge-case 401 occurs
      if (hadToken && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
