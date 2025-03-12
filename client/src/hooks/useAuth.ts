import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { authService } from '../services/authService';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  // Check if token exists in localStorage
  const token = localStorage.getItem('token');
  
  // Fetch current user data if token exists
  const { data, isLoading, error } = useQuery(
    ['currentUser'],
    () => authService.getCurrentUser(),
    {
      enabled: !!token,
      retry: 1,
      onError: () => {
        // Clear token if invalid
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      }
    }
  );

  useEffect(() => {
    if (token && data) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [token, data]);

  const login = async (telegramId: number) => {
    try {
      const response = await authService.login(telegramId);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setIsAuthenticated(true);
      message.success('Đăng nhập thành công');
      navigate('/');
      return response;
    } catch (error) {
      message.error('Đăng nhập thất bại');
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithTelegram = async (userData: any) => {
    try {
      // userData chứa thông tin từ Telegram: id, first_name, last_name, username, photo_url, auth_date, hash
      const response = await authService.loginWithTelegram(userData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setIsAuthenticated(true);
      message.success('Đăng nhập thành công');
      navigate('/');
      return response;
    } catch (error) {
      message.error('Đăng nhập thất bại');
      console.error('Login with Telegram error:', error);
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await authService.register(userData);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setIsAuthenticated(true);
      message.success('Đăng ký thành công');
      navigate('/');
      return response;
    } catch (error) {
      message.error('Đăng ký thất bại');
      console.error('Register error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      message.success('Đăng xuất thành công');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Still remove token and user data even if logout API fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      navigate('/login');
    }
  };

  return {
    isAuthenticated,
    isLoading,
    user: data?.user,
    login,
    loginWithTelegram,
    register,
    logout,
  };
}; 