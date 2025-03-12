import { useState } from 'react';
import { Table, Button, Space, message, Modal, Input, Dropdown, Card, Typography, Tree } from 'antd';
import { FolderAddOutlined, DeleteOutlined, EditOutlined, ShareAltOutlined, MoreOutlined, FolderOutlined } from '@ant-design/icons';
import { useQuery } from 'react-query';
import dayjs from 'dayjs';
import type { DataNode, TreeProps } from 'antd/es/tree';

const { Title } = Typography;
const { Search } = Input;
const { DirectoryTree } = Tree;

// Giả lập dữ liệu thư mục
const mockFolders = [
  {
    id: '1',
    name: 'Tài liệu',
    path: '/Tài liệu',
    isPublic: false,
    parentId: null,
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Hình ảnh',
    path: '/Hình ảnh',
    isPublic: true,
    publicLink: 'https://t.me/c/123/456',
    parentId: null,
    createdAt: '2023-01-02T00:00:00.000Z',
    updatedAt: '2023-01-02T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'Video',
    path: '/Video',
    isPublic: false,
    parentId: null,
    createdAt: '2023-01-03T00:00:00.000Z',
    updatedAt: '2023-01-03T00:00:00.000Z',
  },
  {
    id: '4',
    name: 'Công việc',
    path: '/Tài liệu/Công việc',
    isPublic: false,
    parentId: '1',
    createdAt: '2023-01-04T00:00:00.000Z',
    updatedAt: '2023-01-04T00:00:00.000Z',
  },
  {
    id: '5',
    name: 'Cá nhân',
    path: '/Tài liệu/Cá nhân',
    isPublic: false,
    parentId: '1',
    createdAt: '2023-01-05T00:00:00.000Z',
    updatedAt: '2023-01-05T00:00:00.000Z',
  },
];

// Chuyển đổi dữ liệu thư mục thành cấu trúc cây
const convertToTreeData = (folders: any[]): DataNode[] => {
  const rootFolders = folders.filter(folder => !folder.parentId);
  
  const buildTree = (parentId: string | null): DataNode[] => {
    return folders
      .filter(folder => folder.parentId === parentId)
      .map(folder => ({
        title: folder.name,
        key: folder.id,
        isLeaf: !folders.some(f => f.parentId === folder.id),
        children: buildTree(folder.id),
      }));
  };

  return rootFolders.map(folder => ({
    title: folder.name,
    key: folder.id,
    isLeaf: !folders.some(f => f.parentId === folder.id),
    children: buildTree(folder.id),
  }));
};

const Folders = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<any>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Giả lập fetch dữ liệu
  const { data: folders, isLoading, refetch } = useQuery('folders', () => {
    return Promise.resolve(mockFolders);
  });

  const filteredFolders = folders?.filter(folder => 
    folder.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const treeData = folders ? convertToTreeData(folders) : [];

  const handleCreateFolder = () => {
    setNewFolderName('');
    setIsCreateModalVisible(true);
  };

  const handleRename = (folder: any) => {
    setCurrentFolder(folder);
    setNewFolderName(folder.name);
    setIsRenameModalVisible(true);
  };

  const handleShare = (folder: any) => {
    setCurrentFolder(folder);
    setIsShareModalVisible(true);
  };

  const handleDelete = (folder: any) => {
    Modal.confirm({
      title: 'Xác nhận xóa',
      content: `Bạn có chắc chắn muốn xóa thư mục "${folder.name}"? Tất cả tệp tin và thư mục con sẽ bị xóa.`,
      onOk: () => {
        message.success(`Đã xóa thư mục ${folder.name}`);
        // Implement delete logic
        refetch();
      },
    });
  };

  const handleBatchDelete = () => {
    Modal.confirm({
      title: 'Xác nhận xóa hàng loạt',
      content: `Bạn có chắc chắn muốn xóa ${selectedRowKeys.length} thư mục đã chọn? Tất cả tệp tin và thư mục con sẽ bị xóa.`,
      onOk: () => {
        message.success(`Đã xóa ${selectedRowKeys.length} thư mục`);
        // Implement batch delete logic
        setSelectedRowKeys([]);
        refetch();
      },
    });
  };

  const handleCreateSubmit = () => {
    if (newFolderName.trim() === '') {
      message.error('Tên thư mục không được để trống');
      return;
    }

    message.success(`Đã tạo thư mục ${newFolderName}`);
    // Implement create logic
    setIsCreateModalVisible(false);
    refetch();
  };

  const handleRenameSubmit = () => {
    if (newFolderName.trim() === '') {
      message.error('Tên thư mục không được để trống');
      return;
    }

    message.success(`Đã đổi tên thành ${newFolderName}`);
    // Implement rename logic
    setIsRenameModalVisible(false);
    refetch();
  };

  const handleShareSubmit = () => {
    const isPublic = !currentFolder.isPublic;
    message.success(`Đã ${isPublic ? 'công khai' : 'hủy công khai'} thư mục ${currentFolder.name}`);
    // Implement share logic
    setIsShareModalVisible(false);
    refetch();
  };

  const onSelect: TreeProps['onSelect'] = (selectedKeys) => {
    if (selectedKeys.length > 0) {
      setSelectedFolderId(selectedKeys[0] as string);
    } else {
      setSelectedFolderId(null);
    }
  };

  const columns = [
    {
      title: 'Tên thư mục',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <FolderOutlined />
          <span>{text}</span>
        </Space>
      ),
    },
    {
      title: 'Đường dẫn',
      dataIndex: 'path',
      key: 'path',
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
                icon: <EditOutlined />,
                label: 'Đổi tên',
                onClick: () => handleRename(record),
              },
              {
                key: '2',
                icon: <ShareAltOutlined />,
                label: record.isPublic ? 'Hủy công khai' : 'Công khai',
                onClick: () => handleShare(record),
              },
              {
                key: '3',
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
          <Title level={3}>Quản lý thư mục</Title>
          <Space>
            <Button 
              icon={<FolderAddOutlined />} 
              type="primary"
              onClick={handleCreateFolder}
            >
              Tạo thư mục
            </Button>
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

        <div style={{ display: 'flex', marginBottom: 16 }}>
          <div style={{ width: 300, marginRight: 24, border: '1px solid #f0f0f0', borderRadius: 2 }}>
            <Card title="Cấu trúc thư mục" size="small">
              <DirectoryTree
                defaultExpandAll
                onSelect={onSelect}
                treeData={treeData}
              />
            </Card>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: 16 }}>
              <Search
                placeholder="Tìm kiếm thư mục"
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
              dataSource={filteredFolders}
              rowKey="id"
              loading={isLoading}
            />
          </div>
        </div>
      </Card>

      {/* Create Folder Modal */}
      <Modal
        title="Tạo thư mục mới"
        open={isCreateModalVisible}
        onOk={handleCreateSubmit}
        onCancel={() => setIsCreateModalVisible(false)}
      >
        <Input
          placeholder="Nhập tên thư mục"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
      </Modal>

      {/* Rename Modal */}
      <Modal
        title="Đổi tên thư mục"
        open={isRenameModalVisible}
        onOk={handleRenameSubmit}
        onCancel={() => setIsRenameModalVisible(false)}
      >
        <Input
          placeholder="Nhập tên mới"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
        />
      </Modal>

      {/* Share Modal */}
      <Modal
        title="Chia sẻ thư mục"
        open={isShareModalVisible}
        onOk={handleShareSubmit}
        onCancel={() => setIsShareModalVisible(false)}
        okText={currentFolder?.isPublic ? 'Hủy công khai' : 'Công khai'}
      >
        <p>
          {currentFolder?.isPublic
            ? 'Thư mục này hiện đang được công khai. Bạn có muốn hủy công khai không?'
            : 'Bạn có muốn công khai thư mục này để mọi người có thể truy cập không?'}
        </p>
        {currentFolder?.isPublic && currentFolder?.publicLink && (
          <div>
            <p>Link chia sẻ:</p>
            <Input.TextArea
              value={currentFolder.publicLink}
              readOnly
              autoSize={{ minRows: 1, maxRows: 3 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Folders; 