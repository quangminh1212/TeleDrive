import { useState } from 'react';
import { Table, Button, Space, Upload, message, Modal, Input, Dropdown, Menu, Card, Typography } from 'antd';
import { UploadOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, ShareAltOutlined, MoreOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useQuery } from 'react-query';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Search } = Input;

// Giả lập dữ liệu tệp tin
const mockFiles = [
  {
    id: '1',
    name: 'document.pdf',
    originalName: 'document.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 1024 * 2.5, // 2.5MB
    telegramFileId: 'abc123',
    messageId: 123,
    isPublic: false,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'image.jpg',
    originalName: 'image.jpg',
    mimeType: 'image/jpeg',
    size: 1024 * 1024 * 1.2, // 1.2MB
    telegramFileId: 'def456',
    messageId: 124,
    isPublic: true,
    publicLink: 'https://t.me/c/123/124',
    createdAt: '2023-01-02T00:00:00.000Z',
    updatedAt: '2023-01-02T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'video.mp4',
    originalName: 'video.mp4',
    mimeType: 'video/mp4',
    size: 1024 * 1024 * 15, // 15MB
    telegramFileId: 'ghi789',
    messageId: 125,
    isPublic: false,
    createdAt: '2023-01-03T00:00:00.000Z',
    updatedAt: '2023-01-03T00:00:00.000Z',
  },
];

const Files = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [currentFile, setCurrentFile] = useState<any>(null);
  const [newFileName, setNewFileName] = useState('');

  // Giả lập fetch dữ liệu
  const { data: files, isLoading, refetch } = useQuery('files', () => {
    return Promise.resolve(mockFiles);
  });

  const filteredFiles = files?.filter(file => 
    file.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  };

  const handleRename = (file: any) => {
    setCurrentFile(file);
    setNewFileName(file.name);
    setIsRenameModalVisible(true);
  };

  const handleShare = (file: any) => {
    setCurrentFile(file);
    setIsShareModalVisible(true);
  };

  const handleDownload = (file: any) => {
    message.success(`Đang tải xuống ${file.name}`);
    // Implement download logic
  };

  const handleDelete = (file: any) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa tệp tin "${file.name}"?`,
      onOk: () => {
        message.success(`Đã xóa ${file.name}`);
        // Implement delete logic
        refetch();
      },
    });
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: 'Xác nhận xóa hàng loạt',
      content: `Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} tệp tin đã chọn?`,
      onOk: () => {
        message.success(`Đã xóa ${selectedRowKeys.length} tệp tin`);
        // Implement batch delete logic
        setSelectedRowKeys([]);
        refetch();
      },
    });
  };

  const handleRenameSubmit = () => {
    if (newFileName.trim() === '') {
      message.error('Tên tệp tin không được để trống');
      return;
    }

    message.success(`Đã đổi tên thành ${newFileName}`);
    // Implement rename logic
    setIsRenameModalVisible(false);
    refetch();
  };

  const handleShareSubmit = () => {
    const isPublic = !currentFile.isPublic;
    message.success(`Đã ${isPublic ? 'công khai' : 'hủy công khai'} tệp tin ${currentFile.name}`);
    // Implement share logic
    setIsShareModalVisible(false);
    refetch();
  };

  const uploadProps: UploadProps = {
    name: 'file',
    action: '/api/files/upload',
    headers: {
      authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    onChange(info) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} đã được tải lên thành công`);
        refetch();
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} tải lên thất bại.`);
      }
    },
    showUploadList: false,
  };

  const columns = [
    {
      title: 'Tên tệp tin',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: any) => (
        <a onClick={() => handleDownload(record)}>{text}</a>
      ),
    },
    {
      title: 'Kích thước',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size),
    },
    {
      title: 'Loại',
      dataIndex: 'mimeType',
      key: 'mimeType',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isPublic',
      key: 'isPublic',
      render: (isPublic: boolean) => (
        isPublic ? 'Công khai' : 'Riêng tư'
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: any) => (
        <Dropdown
          menu={{
            items: [
              {
                key: '1',
                icon: <DownloadOutlined />,
                label: 'Tải xuống',
                onClick: () => handleDownload(record),
              },
              {
                key: '2',
                icon: <EditOutlined />,
                label: 'Đổi tên',
                onClick: () => handleRename(record),
              },
              {
                key: '3',
                icon: <ShareAltOutlined />,
                label: record.isPublic ? 'Hủy công khai' : 'Công khai',
                onClick: () => handleShare(record),
              },
              {
                key: '4',
                icon: <DeleteOutlined />,
                label: 'Xóa',
                danger: true,
                onClick: () => handleDelete(record),
              },
            ],
          }}
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys);
    },
  };

  const hasSelected = selectedRowKeys.length > 0;

  return (
    <div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={3}>Quản lý tệp tin</Title>
          <Space>
            <Upload {...uploadProps}>
              <Button icon={<UploadOutlined />} type="primary">
                Tải lên
              </Button>
            </Upload>
            {hasSelected && (
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                onClick={handleBatchDelete}
              >
                Xóa ({selectedRowKeys.length})
              </Button>
            )}
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="Tìm kiếm tệp tin"
            allowClear
            enterButton="Tìm kiếm"
            size="middle"
            onSearch={(value) => setSearchText(value)}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
          />
        </div>

        <Table
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredFiles}
          rowKey="id"
          loading={isLoading}
        />
      </Card>

      {/* Rename Modal */}
      <Modal
        title="Đổi tên tệp tin"
        open={isRenameModalVisible}
        onOk={handleRenameSubmit}
        onCancel={() => setIsRenameModalVisible(false)}
      >
        <Input
          placeholder="Nhập tên mới"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
        />
      </Modal>

      {/* Share Modal */}
      <Modal
        title="Chia sẻ tệp tin"
        open={isShareModalVisible}
        onOk={handleShareSubmit}
        onCancel={() => setIsShareModalVisible(false)}
        okText={currentFile?.isPublic ? 'Hủy công khai' : 'Công khai'}
      >
        <p>
          {currentFile?.isPublic
            ? 'Tệp tin này hiện đang được công khai. Bạn có muốn hủy công khai không?'
            : 'Bạn có muốn công khai tệp tin này để mọi người có thể truy cập không?'}
        </p>
        {currentFile?.isPublic && currentFile?.publicLink && (
          <div>
            <p>Link chia sẻ:</p>
            <Input.TextArea
              value={currentFile.publicLink}
              readOnly
              autoSize={{ minRows: 1, maxRows: 3 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Files; 