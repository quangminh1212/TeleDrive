import { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { authService } from '../services/authService';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  // Fetch current user data to check if session is valid
  const { data, isLoading, error, refetch } = useQuery(
    ['currentUser'],
    () => authService.getCurrentUser(),
    {
      retry: 1,
      onError: () => {
        setIsAuthenticated(false);
      }
    }
  );

  useEffect(() => {
    if (data?.user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [data]);

  const login = async (telegramId: number) => {
    try {
      const response = await authService.login(telegramId);
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
      setIsAuthenticated(false);
      message.success('Đăng xuất thành công');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
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
    refetchUser: refetch
  };
}; 