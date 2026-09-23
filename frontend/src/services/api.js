import axios from 'axios';

// Create an Axios instance with base configuration
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiUrl = rawBaseUrl ? `${rawBaseUrl}/api` : 'http://localhost:5000/api';

const api = axios.create({
  baseURL: apiUrl,
});

// Request interceptor to attach auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle global errors here (e.g., 401 Unauthorized -> redirect to login)
    // But don't redirect if we are already trying to login!
    const isAuthUrl = error.config?.url?.includes('/auth/login');
    
    if (error.response?.status === 401 && !isAuthUrl) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
