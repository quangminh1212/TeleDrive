import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Progress, Button, Space } from 'antd';
import { FileOutlined, FolderOutlined, CloudUploadOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery } from 'react-query';
import { telegramService } from '../services/telegramService';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [storageData, setStorageData] = useState({
    totalFiles: 0,
    totalSize: 0,
    sizeInMB: '0',
    sizeInGB: '0',
  });

  // Fetch storage usage
  const { data: storageUsage, isLoading: isLoadingStorage } = useQuery(
    'storageUsage',
    () => telegramService.getStorageUsage(),
    {
      onSuccess: (data) => {
        setStorageData(data);
      },
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

  return (
    <div>
      <Title level={2}>Xin chào, {user?.firstName || 'Người dùng'}!</Title>
      <p>Chào mừng đến với TeleDrive - Lưu trữ đám mây không giới hạn với Telegram.</p>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tổng số tệp tin"
              value={storageData.totalFiles}
              prefix={<FileOutlined />}
              loading={isLoadingStorage}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Dung lượng đã sử dụng"
              value={storageData.sizeInMB}
              suffix="MB"
              precision={2}
              prefix={<CloudUploadOutlined />}
              loading={isLoadingStorage}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Bot Telegram"
              value={botInfo?.botInfo?.username || 'Chưa kết nối'}
              prefix={<LinkOutlined />}
              loading={isLoadingBotInfo}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Tài khoản"
              value={user?.telegramUsername || user?.telegramPhoneNumber || 'Chưa xác định'}
              prefix={<FileOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <Title level={4}>Dung lượng lưu trữ</Title>
        <Progress
          percent={parseFloat(storageData.sizeInGB) > 0 ? Math.min(parseFloat(storageData.sizeInGB) / 20 * 100, 100) : 0}
          status="active"
          strokeColor={{
            '0%': '#108ee9',
            '100%': '#87d068',
          }}
          format={() => `${storageData.sizeInGB} GB`}
        />
        <p>Telegram cho phép lưu trữ không giới hạn, nhưng mỗi tệp tin có kích thước tối đa 2GB.</p>
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Space size="middle">
            <Button type="primary" size="large" icon={<CloudUploadOutlined />} onClick={() => navigate('/files')}>
              Tải lên tệp tin
            </Button>
            <Button size="large" icon={<FolderOutlined />} onClick={() => navigate('/folders')}>
              Quản lý thư mục
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 