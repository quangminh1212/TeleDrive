import axios from 'axios';

const API_URL = '/api/telegram';

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

export const telegramService = {
  // Send verification code
  sendCode: async (phoneNumber: string) => {
    const response = await axios.post(`${API_URL}/send-code`, { phoneNumber });
    return response.data;
  },

  // Verify code
  verifyCode: async (phoneNumber: string, code: string, phoneCodeHash: string) => {
    const response = await axios.post(`${API_URL}/verify-code`, {
      phoneNumber,
      code,
      phoneCodeHash,
    });
    return response.data;
  },

  // Get bot link
  getBotLink: async () => {
    const response = await axios.get(`${API_URL}/bot-link`);
    return response.data;
  },

  // Get bot info
  getBotInfo: async () => {
    const response = await authAxios.get(`${API_URL}/bot-info`);
    return response.data;
  },

  // Get storage usage
  getStorageUsage: async () => {
    const response = await authAxios.get(`${API_URL}/storage-usage`);
    return response.data;
  },
}; 