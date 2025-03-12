import axios from 'axios';

const API_URL = '/api/auth';

// Create axios instance with auth header
const authAxios = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
authAxios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authService = {
  // Register new user
  register: async (userData: any) => {
    const response = await axios.post(`${API_URL}/register`, userData);
    return response.data;
  },

  // Login user
  login: async (telegramId: number) => {
    const response = await axios.post(`${API_URL}/login`, { telegramId });
    return response.data;
  },

  // Logout user
  logout: async () => {
    const response = await authAxios.post(`${API_URL}/logout`);
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await authAxios.get(`${API_URL}/me`);
    return response.data;
  },
}; 