import axios from 'axios';

const API_URL = '/api/auth';

// Tạo axios instance với credentials
const authAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true // Quan trọng để gửi cookies cho cross-site requests
});

export const authService = {
  // Register new user
  register: async (userData: any) => {
    const response = await axios.post(`${API_URL}/register`, userData, { withCredentials: true });
    return response.data;
  },

  // Login user
  login: async (telegramId: number) => {
    const response = await axios.post(`${API_URL}/login`, { telegramId }, { withCredentials: true });
    return response.data;
  },

  // Login with Telegram widget
  loginWithTelegram: async (telegramData: any) => {
    const response = await axios.post(`${API_URL}/login/telegram`, telegramData, { withCredentials: true });
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