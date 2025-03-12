import { useState } from 'react';
import { Card, Tabs, Form, Input, Button, Switch, Typography, Divider, message, Space, Statistic, Alert } from 'antd';
import { UserOutlined, LockOutlined, RobotOutlined, SaveOutlined, LinkOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { useQuery } from 'react-query';
import { telegramService } from '../services/telegramService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Settings = () => {
  const { user, logout } = useAuth();
  const [form] = Form.useForm();
  const [botLinkLoading, setBotLinkLoading] = useState(false);
  const [botLink, setBotLink] = useState('');

  // Fetch storage usage
  const { data: storageUsage, isLoading: isLoadingStorage } = useQuery(
    'storageUsage',
    () => telegramService.getStorageUsage(),
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  // Fetch bot info
  const { data: botInfo, isLoading: isLoadingBotInfo } = useQuery(
    'botInfo',
    () => telegramService.getBotInfo(),
    {
      refetchInterval: 300000, // Refresh every 5 minutes
    }
  );

  const handleGetBotLink = async () => {
    try {
      setBotLinkLoading(true);
      const response = await telegramService.getBotLink();
      setBotLink(response.botLink);
      message.success('Đã lấy link bot thành công');
    } catch (error) {
      console.error('Get bot link error:', error);
      message.error('Lỗi khi lấy link bot');
    } finally {
      setBotLinkLoading(false);
    }
  };

  const handleSaveProfile = (values: any) => {
    message.success('Đã lưu thông tin cá nhân');
    // Implement save profile logic
  };

  const handleSavePreferences = (values: any) => {
    message.success('Đã lưu tùy chọn');
    // Implement save preferences logic
  };

  return (
    <div>
      <Title level={2}>Cài đặt</Title>

      <Tabs defaultActiveKey="1">
        <TabPane
          tab={
            <span>
              <UserOutlined />
              Thông tin cá nhân
            </span>
          }
          key="1"
        >
          <Card>
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                firstName: user?.firstName || '',
                lastName: user?.lastName || '',
                email: user?.email || '',
                telegramUsername: user?.telegramUsername || '',
                telegramPhoneNumber: user?.telegramPhoneNumber || '',
              }}
              onFinish={handleSaveProfile}
            >
              <Form.Item
                label="Tên"
                name="firstName"
              >
                <Input prefix={<UserOutlined />} placeholder="Tên" />
              </Form.Item>

              <Form.Item
                label="Họ"
                name="lastName"
              >
                <Input prefix={<UserOutlined />} placeholder="Họ" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
              >
                <Input prefix={<UserOutlined />} placeholder="Email" />
              </Form.Item>

              <Form.Item
                label="Tên người dùng Telegram"
                name="telegramUsername"
              >
                <Input prefix={<UserOutlined />} disabled />
              </Form.Item>

              <Form.Item
                label="Số điện thoại Telegram"
                name="telegramPhoneNumber"
              >
                <Input prefix={<UserOutlined />} disabled />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  Lưu thông tin
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <RobotOutlined />
              Bot Telegram
            </span>
          }
          key="2"
        >
          <Card>
            <Title level={4}>Thông tin Bot</Title>
            <Divider />

            {botInfo?.botInfo ? (
              <div>
                <Space size="large" style={{ marginBottom: 24 }}>
                  <Statistic
                    title="Tên Bot"
                    value={botInfo.botInfo.first_name}
                    loading={isLoadingBotInfo}
                  />
                  <Statistic
                    title="Username"
                    value={botInfo.botInfo.username}
                    loading={isLoadingBotInfo}
                  />
                </Space>

                <div style={{ marginBottom: 16 }}>
                  <Text strong>Link Bot: </Text>
                  <a href={`https://t.me/${botInfo.botInfo.username}`} target="_blank" rel="noopener noreferrer">
                    https://t.me/{botInfo.botInfo.username}
                  </a>
                </div>

                <Alert
                  message="Hướng dẫn"
                  description="Sử dụng bot này để tải lên và quản lý tệp tin của bạn trực tiếp từ Telegram."
                  type="info"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              </div>
            ) : (
              <div>
                <Alert
                  message="Chưa kết nối Bot"
                  description="Bạn chưa kết nối với Bot Telegram. Vui lòng nhấn nút bên dưới để lấy link Bot."
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />

                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={handleGetBotLink}
                  loading={botLinkLoading}
                >
                  Lấy link Bot
                </Button>

                {botLink && (
                  <div style={{ marginTop: 16 }}>
                    <Text strong>Link Bot: </Text>
                    <a href={botLink} target="_blank" rel="noopener noreferrer">
                      {botLink}
                    </a>
                  </div>
                )}
              </div>
            )}
          </Card>
        </TabPane>

        <TabPane
          tab={
            <span>
              <LockOutlined />
              Bảo mật
            </span>
          }
          key="3"
        >
          <Card>
            <Title level={4}>Tùy chọn bảo mật</Title>
            <Divider />

            <Form
              layout="vertical"
              onFinish={handleSavePreferences}
              initialValues={{
                publicByDefault: false,
                autoDeleteTemp: true,
                showFileSize: true,
              }}
            >
              <Form.Item
                label="Công khai tệp tin theo mặc định"
                name="publicByDefault"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Tự động xóa tệp tin tạm sau khi tải lên"
                name="autoDeleteTemp"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Hiển thị kích thước tệp tin"
                name="showFileSize"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
                  Lưu tùy chọn
                </Button>
              </Form.Item>
            </Form>

            <Divider />

            <Title level={4}>Đăng xuất</Title>
            <Text>Đăng xuất khỏi tài khoản của bạn</Text>
            <div style={{ marginTop: 16 }}>
              <Button danger onClick={logout}>
                Đăng xuất
              </Button>
            </div>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default Settings; 