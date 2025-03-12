import { useEffect, useRef, useState } from 'react';
import { Card, Typography, Spin, Alert } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from 'react-query';
import { telegramService } from '../services/telegramService';
import { useLocation, useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: any) => void;
    };
    Telegram: {
      Login: {
        auth: (params: any) => void;
      };
    };
  }
}

// Hàm để lấy query params từ URL
const useQueryParams = () => {
  return new URLSearchParams(useLocation().search);
};

const Login = () => {
  const { loginWithTelegram } = useAuth();
  const telegramLoginRef = useRef<HTMLDivElement>(null);
  const [botUsername, setBotUsername] = useState<string>('');
  const [error, setError] = useState<string>('');
  const queryParams = useQueryParams();
  const navigate = useNavigate();
  
  // Xử lý callback từ Telegram nếu có
  useEffect(() => {
    const authParam = queryParams.get('auth');
    if (authParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(authParam));
        // Nếu có dữ liệu callback từ Telegram, thực hiện đăng nhập
        loginWithTelegram(userData)
          .then(() => {
            // Xóa query params sau khi đăng nhập thành công
            navigate('/login', { replace: true });
          })
          .catch((err) => {
            console.error('Login error:', err);
            setError('Đăng nhập thất bại. Vui lòng thử lại.');
          });
      } catch (err) {
        console.error('Error parsing auth data:', err);
        setError('Dữ liệu xác thực không hợp lệ.');
      }
    }
  }, [queryParams, loginWithTelegram, navigate]);

  // Fetch bot info to get username
  const { isLoading } = useQuery(
    'botInfo',
    async () => {
      try {
        const response = await telegramService.getBotLink();
        setBotUsername(response.botUsername);
        return response;
      } catch (err) {
        console.error('Error fetching bot info:', err);
        setError('Không thể kết nối với bot Telegram. Vui lòng thử lại sau.');
        return null;
      }
    },
    {
      retry: 1,
    }
  );

  useEffect(() => {
    if (!botUsername) return;

    // Tạo script để tải Telegram Login Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-auth-url', `${window.location.origin}/auth/telegram/callback`);
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    // Đặt callback function cho Telegram Login Widget
    window.TelegramLoginWidget = {
      dataOnauth: (user) => {
        loginWithTelegram(user);
      }
    };

    // Xóa bất kỳ script nào đã tồn tại trước đó
    if (telegramLoginRef.current) {
      telegramLoginRef.current.innerHTML = '';
      telegramLoginRef.current.appendChild(script);
    }

    return () => {
      // Xóa script khi component unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [loginWithTelegram, botUsername]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 8px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2} style={{ color: '#0088cc' }}>TeleDrive</Title>
          <Text>Lưu trữ đám mây không giới hạn với Telegram</Text>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Text>Đăng nhập với tài khoản Telegram của bạn để tiếp tục.</Text>
        </div>

        {error && (
          <Alert 
            message="Lỗi kết nối" 
            description={error}
            type="error" 
            style={{ marginBottom: 16 }} 
            showIcon
          />
        )}

        <div ref={telegramLoginRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          {(isLoading || !botUsername) && <Spin tip="Đang tải..." />}
        </div>

        <Alert
          message="Lưu ý"
          description="Đăng nhập bằng Telegram để bảo mật thông tin của bạn. Chúng tôi không lưu trữ mật khẩu của bạn."
          type="info"
          showIcon
        />
      </Card>
    </div>
  );
};

export default Login; 