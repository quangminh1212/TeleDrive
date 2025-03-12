import React, { useState } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Grid,
  Paper,
  Menu,
  MenuItem,
  Avatar,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  CloudUpload as CloudUploadIcon,
  Settings as SettingsIcon,
  AccountCircle,
  Search as SearchIcon,
  Logout as LogoutIcon,
  NavigateNext as NavigateNextIcon,
  InsertDriveFile as FileIcon,
  Image as ImageIcon,
  Movie as VideoIcon,
  AudioFile as AudioIcon,
  Archive as ArchiveIcon,
  Description as DocumentIcon,
  MoreVert as MoreVertIcon,
  CreateNewFolder as CreateNewFolderIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

// Dummy data for files and folders
const DUMMY_DATA = {
  currentPath: 'Thư mục của tôi/Tài liệu',
  folders: [
    { id: 1, name: 'Hình ảnh', type: 'folder', createdAt: '2023-11-20', size: null },
    { id: 2, name: 'Tài liệu', type: 'folder', createdAt: '2023-11-19', size: null },
    { id: 3, name: 'Video', type: 'folder', createdAt: '2023-11-18', size: null },
  ],
  files: [
    { id: 4, name: 'Báo cáo tài chính.pdf', type: 'document', createdAt: '2023-11-17', size: 2.5 },
    { id: 5, name: 'Ảnh đại diện.jpg', type: 'image', createdAt: '2023-11-16', size: 1.8 },
    { id: 6, name: 'Presentation.pptx', type: 'document', createdAt: '2023-11-15', size: 5.3 },
    { id: 7, name: 'Video demo.mp4', type: 'video', createdAt: '2023-11-14', size: 15.7 },
    { id: 8, name: 'Bản ghi âm.mp3', type: 'audio', createdAt: '2023-11-13', size: 3.2 },
    { id: 9, name: 'project.zip', type: 'archive', createdAt: '2023-11-12', size: 42.1 },
    { id: 10, name: 'Readme.txt', type: 'document', createdAt: '2023-11-11', size: 0.1 },
  ]
};

// Component for showing file icons based on type
const FileTypeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'folder':
      return <FolderIcon />;
    case 'image':
      return <ImageIcon />;
    case 'video':
      return <VideoIcon />;
    case 'audio':
      return <AudioIcon />;
    case 'archive':
      return <ArchiveIcon />;
    case 'document':
      return <DocumentIcon />;
    default:
      return <FileIcon />;
  }
};

export default function Dashboard() {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState('list');
  
  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      console.log('Accepted files:', acceptedFiles);
      // Handle file upload logic
    }
  });
  
  // Handle user menu
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  // Handle item context menu
  const handleItemMenu = (event: React.MouseEvent<HTMLElement>, item: any) => {
    event.stopPropagation();
    setSelectedItem(item);
    setAnchorEl(event.currentTarget);
  };
  
  // Handle file/folder click
  const handleItemClick = (item: any) => {
    if (item.type === 'folder') {
      console.log('Navigate to folder:', item.name);
      // Navigation logic
    } else {
      console.log('Preview file:', item.name);
      // File preview logic
    }
  };
  
  // Format file size
  const formatFileSize = (size: number | null) => {
    if (size === null) return '';
    if (size < 1) return `${(size * 1000).toFixed(0)} KB`;
    return `${size.toFixed(1)} MB`;
  };

  // Drawer content
  const drawerContent = (
    <Box sx={{ width: 250 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          bgcolor: theme.palette.primary.main,
          color: 'white',
        }}
      >
        <Typography variant="h6" component="div">
          TeleDrive
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem button selected>
          <ListItemIcon>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Tất cả file" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <ImageIcon />
          </ListItemIcon>
          <ListItemText primary="Hình ảnh" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <VideoIcon />
          </ListItemIcon>
          <ListItemText primary="Video" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <DocumentIcon />
          </ListItemIcon>
          <ListItemText primary="Tài liệu" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <AudioIcon />
          </ListItemIcon>
          <ListItemText primary="Âm thanh" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <ArchiveIcon />
          </ListItemIcon>
          <ListItemText primary="Lưu trữ" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Cài đặt" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Đăng xuất" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <div>
      <Head>
        <title>Dashboard - TeleDrive</title>
      </Head>

      {/* App Bar */}
      <AppBar position="fixed" color="default" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => setDrawerOpen(true)}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            TeleDrive
          </Typography>
          <IconButton color="inherit">
            <SearchIcon />
          </IconButton>
          <IconButton
            color="inherit"
            onClick={handleMenuClick}
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem onClick={handleMenuClose}>Hồ sơ</MenuItem>
            <MenuItem onClick={handleMenuClose}>Cài đặt</MenuItem>
            <Divider />
            <MenuItem onClick={handleMenuClose}>Đăng xuất</MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {drawerContent}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          pt: 10,
          pb: 4,
          px: 3,
          bgcolor: '#f5f5f5',
          minHeight: '100vh',
        }}
      >
        <Container maxWidth="xl">
          {/* Storage info and upload button */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h5" component="h1" gutterBottom>
                Thư mục của tôi
              </Typography>
              <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                aria-label="breadcrumb"
              >
                <Link color="inherit" href="#" onClick={() => console.log('Navigate to root')}>
                  Thư mục của tôi
                </Link>
                <Typography color="text.primary">Tài liệu</Typography>
              </Breadcrumbs>
            </Box>
            <Box>
              <Button
                variant="contained"
                startIcon={<CloudUploadIcon />}
                {...getRootProps()}
                sx={{ mr: 1 }}
              >
                <input {...getInputProps()} />
                Tải lên
              </Button>
              <Button
                variant="outlined"
                startIcon={<CreateNewFolderIcon />}
                onClick={() => console.log('Create folder')}
              >
                Tạo thư mục
              </Button>
            </Box>
          </Box>

          {/* Storage usage */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Dung lượng đã sử dụng
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              <Box
                sx={{
                  flexGrow: 1,
                  height: 8,
                  bgcolor: '#e0e0e0',
                  borderRadius: 4,
                  mr: 2,
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: '35%',
                    height: '100%',
                    bgcolor: theme.palette.primary.main,
                    borderRadius: 4,
                  }}
                />
              </Box>
              <Typography variant="body2">
                35.2 GB / Không giới hạn
              </Typography>
            </Box>
          </Paper>

          {/* Files and folders container */}
          <Paper sx={{ p: 3 }}>
            {/* Header with file count and sort options */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography>
                {DUMMY_DATA.folders.length} thư mục, {DUMMY_DATA.files.length} file
              </Typography>
              <Box>
                {/* Sort and view options would go here */}
              </Box>
            </Box>

            {/* Files and folders grid */}
            <Grid container spacing={2}>
              {/* Folders */}
              {DUMMY_DATA.folders.map((folder) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={folder.id}>
                  <Card
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                    onClick={() => handleItemClick(folder)}
                  >
                    <Box
                      className={`file-icon folder`}
                      sx={{
                        bgcolor: '#e3f2fd',
                        color: '#1976d2',
                      }}
                    >
                      <FolderIcon />
                    </Box>
                    <CardContent sx={{ flex: '1 0 auto', p: 1 }}>
                      <Typography variant="body1" noWrap>
                        {folder.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {folder.createdAt}
                      </Typography>
                    </CardContent>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleItemMenu(e, folder)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Card>
                </Grid>
              ))}

              {/* Files */}
              {DUMMY_DATA.files.map((file) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
                  <Card
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                    onClick={() => handleItemClick(file)}
                  >
                    <Box
                      className={`file-icon ${file.type}`}
                    >
                      <FileTypeIcon type={file.type} />
                    </Box>
                    <CardContent sx={{ flex: '1 0 auto', p: 1 }}>
                      <Typography variant="body1" noWrap>
                        {file.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {formatFileSize(file.size)} • {file.createdAt}
                      </Typography>
                    </CardContent>
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleItemMenu(e, file)}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* Context Menu for Files/Folders */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl) && Boolean(selectedItem)}
        onClose={() => {
          setAnchorEl(null);
          setSelectedItem(null);
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Tải xuống</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Chia sẻ</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Đổi tên</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Xóa</ListItemText>
        </MenuItem>
      </Menu>
    </div>
  );
} 