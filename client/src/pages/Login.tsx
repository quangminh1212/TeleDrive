import { useEffect, useRef } from 'react';
import { Card, Typography, Spin, Alert } from 'antd';
import { useAuth } from '../hooks/useAuth';

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

const Login = () => {
  const { loginWithTelegram } = useAuth();
  const telegramLoginRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Tạo script để tải Telegram Login Widget
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', 'YOUR_BOT_USERNAME'); // Thay YOUR_BOT_USERNAME bằng username của bot của bạn
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

    // Thêm script vào DOM
    if (telegramLoginRef.current) {
      telegramLoginRef.current.appendChild(script);
    }

    return () => {
      // Xóa script khi component unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [loginWithTelegram]);

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

        <div ref={telegramLoginRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Spin tip="Đang tải..." />
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