import { useState } from 'react';
import { Card, Form, Input, Button, Typography, Steps, message, Alert } from 'antd';
import { UserOutlined, LockOutlined, MobileOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { telegramService } from '../services/telegramService';

const { Title, Text } = Typography;
const { Step } = Steps;

const Login = () => {
  const [form] = Form.useForm();
  const { login } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    try {
      setLoading(true);
      setError('');
      const phone = form.getFieldValue('phoneNumber');
      
      if (!phone) {
        setError('Vui lòng nhập số điện thoại');
        return;
      }

      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      setPhoneNumber(formattedPhone);

      const response = await telegramService.sendCode(formattedPhone);
      setPhoneCodeHash(response.phoneCodeHash);
      message.success('Mã xác thực đã được gửi đến điện thoại của bạn');
      setCurrentStep(1);
    } catch (error: any) {
      console.error('Send code error:', error);
      setError(error.response?.data?.message || 'Lỗi khi gửi mã xác thực');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    try {
      setLoading(true);
      setError('');
      const code = form.getFieldValue('verificationCode');
      
      if (!code) {
        setError('Vui lòng nhập mã xác thực');
        return;
      }

      const response = await telegramService.verifyCode(phoneNumber, code, phoneCodeHash);
      message.success('Xác thực thành công');
      
      // Login with the user data
      await login(response.user.telegramId);
    } catch (error: any) {
      console.error('Verify code error:', error);
      setError(error.response?.data?.message || 'Lỗi khi xác thực mã');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: 'Số điện thoại',
      content: (
        <Form.Item
          name="phoneNumber"
          rules={[{ required: true, message: 'Vui lòng nhập số điện thoại Telegram của bạn' }]}
        >
          <Input
            prefix={<MobileOutlined />}
            placeholder="Số điện thoại (VD: +84123456789)"
            size="large"
          />
        </Form.Item>
      ),
    },
    {
      title: 'Xác thực',
      content: (
        <Form.Item
          name="verificationCode"
          rules={[{ required: true, message: 'Vui lòng nhập mã xác thực' }]}
        >
          <Input
            prefix={<LockOutlined />}
            placeholder="Mã xác thực"
            size="large"
          />
        </Form.Item>
      ),
    },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: 400, boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ color: '#0088cc' }}>TeleDrive</Title>
          <Text>Đăng nhập bằng tài khoản Telegram</Text>
        </div>

        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map(item => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>

        {error && <Alert message={error} type="error" style={{ marginBottom: 16 }} />}

        <Form
          form={form}
          name="login"
          initialValues={{ remember: true }}
          onFinish={currentStep === 0 ? handleSendCode : handleVerifyCode}
        >
          {steps[currentStep].content}

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              style={{ backgroundColor: '#0088cc' }}
            >
              {currentStep === 0 ? 'Gửi mã xác thực' : 'Đăng nhập'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login; 