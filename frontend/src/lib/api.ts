import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout (email sending can take time)
});

// Attach the JWT token to every outgoing request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses globally — clear stale token & redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only clear token for non-auth endpoints (don't clear during login attempt)
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/signup') || url.includes('/auth/verify-otp');
      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        // Redirect to auth page if not already there
        if (!window.location.pathname.startsWith('/auth')) {
          window.location.href = '/auth?mode=login';
        }
      }
    }
    return Promise.reject(error);
  }
);
