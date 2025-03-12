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
  Paper,
  Grid,
  Avatar,
  Switch,
  Button,
  TextField,
  FormControlLabel,
  Tabs,
  Tab,
  Menu,
  MenuItem,
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
  Person as PersonIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Notifications as NotificationsIcon,
  HelpOutline as HelpIcon,
  NavigateNext as NavigateNextIcon,
  Delete as DeleteIcon,
  Language as LanguageIcon,
  DarkMode as DarkModeIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import Link from 'next/link';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export default function Settings() {
  const theme = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('Tiếng Việt');
  
  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };
  
  // Handle user menu
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
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
        <Link href="/dashboard" passHref>
          <ListItem button component="a">
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Tất cả file" />
          </ListItem>
        </Link>
        <ListItem button>
          <ListItemIcon>
            <FolderIcon />
          </ListItemIcon>
          <ListItemText primary="Thư mục của tôi" />
        </ListItem>
        <ListItem button>
          <ListItemIcon>
            <CloudUploadIcon />
          </ListItemIcon>
          <ListItemText primary="Tải lên" />
        </ListItem>
      </List>
      <Divider />
      <List>
        <ListItem button selected>
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
        <title>Cài đặt - TeleDrive</title>
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
          pb: 8,
          px: 3,
          bgcolor: '#f5f5f5',
          minHeight: '100vh',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h5" component="h1" gutterBottom fontWeight="500">
            Cài đặt
          </Typography>
          
          <Paper sx={{ mt: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="settings tabs"
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                bgcolor: 'white' 
              }}
            >
              <Tab label="Tài khoản" icon={<PersonIcon />} iconPosition="start" {...a11yProps(0)} />
              <Tab label="Bảo mật" icon={<SecurityIcon />} iconPosition="start" {...a11yProps(1)} />
              <Tab label="Lưu trữ" icon={<StorageIcon />} iconPosition="start" {...a11yProps(2)} />
              <Tab label="Chung" icon={<SettingsIcon />} iconPosition="start" {...a11yProps(3)} />
            </Tabs>
            
            {/* Account Settings */}
            <TabPanel value={activeTab} index={0}>
              <Box px={2}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    mb: 4 
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 80, 
                      height: 80, 
                      bgcolor: theme.palette.primary.main,
                      mr: 3
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 40 }} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">Nguyễn Văn A</Typography>
                    <Typography variant="body2" color="text.secondary">
                      @nguyenvana
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      sx={{ mt: 1 }}
                    >
                      Thay đổi ảnh
                    </Button>
                  </Box>
                </Box>
                
                <Divider sx={{ mb: 3 }} />
                
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Tên người dùng"
                      fullWidth
                      defaultValue="Nguyễn Văn A"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Email"
                      fullWidth
                      defaultValue="nguyenvana@example.com"
                      variant="outlined"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Số điện thoại"
                      fullWidth
                      defaultValue="+84 123 456 789"
                      variant="outlined"
                      disabled
                      helperText="Liên kết với tài khoản Telegram của bạn"
                    />
                  </Grid>
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                  >
                    Lưu thay đổi
                  </Button>
                </Box>
              </Box>
            </TabPanel>
            
            {/* Security Settings */}
            <TabPanel value={activeTab} index={1}>
              <Box px={2}>
                <Typography variant="h6" gutterBottom>
                  Bảo mật tài khoản
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <SecurityIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Xác thực hai yếu tố" 
                      secondary="Bảo vệ tài khoản của bạn bằng xác thực hai yếu tố"
                    />
                    <Switch checked={true} />
                  </ListItem>
                  
                  <Divider variant="inset" component="li" />
                  
                  <ListItem>
                    <ListItemIcon>
                      <SecurityIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Thông báo đăng nhập" 
                      secondary="Nhận thông báo khi có đăng nhập mới vào tài khoản của bạn"
                    />
                    <Switch checked={true} />
                  </ListItem>
                  
                  <Divider variant="inset" component="li" />
                  
                  <ListItem button>
                    <ListItemIcon>
                      <DeleteIcon color="error" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Xóa tài khoản" 
                      secondary="Xóa vĩnh viễn tài khoản và dữ liệu của bạn"
                      primaryTypographyProps={{ color: 'error' }}
                    />
                    <NavigateNextIcon color="action" />
                  </ListItem>
                </List>
              </Box>
            </TabPanel>
            
            {/* Storage Settings */}
            <TabPanel value={activeTab} index={2}>
              <Box px={2}>
                <Typography variant="h6" gutterBottom>
                  Thông tin lưu trữ
                </Typography>
                
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    mb: 3,
                    bgcolor: 'rgba(42, 171, 238, 0.05)' 
                  }}
                >
                  <Typography variant="body2" gutterBottom>
                    Dung lượng đã sử dụng
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                    <Box
                      sx={{
                        flexGrow: 1,
                        height: 10,
                        bgcolor: '#e0e0e0',
                        borderRadius: 5,
                        mr: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: '35%',
                          height: '100%',
                          bgcolor: theme.palette.primary.main,
                          borderRadius: 5,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      35.2 GB / Không giới hạn
                    </Typography>
                  </Box>
                </Paper>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <FolderIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Tài liệu" 
                      secondary="18.5 GB"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <FolderIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Hình ảnh" 
                      secondary="9.3 GB"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <FolderIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Video" 
                      secondary="5.8 GB"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <FolderIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Khác" 
                      secondary="1.6 GB"
                    />
                  </ListItem>
                </List>
                
                <Divider sx={{ my: 2 }} />
                
                <Box>
                  <Button 
                    variant="outlined" 
                    color="primary"
                    startIcon={<StorageIcon />}
                  >
                    Quản lý dung lượng
                  </Button>
                </Box>
              </Box>
            </TabPanel>
            
            {/* General Settings */}
            <TabPanel value={activeTab} index={3}>
              <Box px={2}>
                <Typography variant="h6" gutterBottom>
                  Cài đặt chung
                </Typography>
                
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <DarkModeIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Chế độ tối" 
                      secondary="Thay đổi giao diện sang chế độ tối"
                    />
                    <Switch 
                      checked={darkMode} 
                      onChange={() => setDarkMode(!darkMode)} 
                    />
                  </ListItem>
                  
                  <Divider variant="inset" component="li" />
                  
                  <ListItem>
                    <ListItemIcon>
                      <LanguageIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Ngôn ngữ" 
                      secondary={language}
                    />
                    <Button variant="outlined" size="small">
                      Thay đổi
                    </Button>
                  </ListItem>
                  
                  <Divider variant="inset" component="li" />
                  
                  <ListItem>
                    <ListItemIcon>
                      <NotificationsIcon />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Thông báo" 
                      secondary="Nhận thông báo về các hoạt động trong tài khoản"
                    />
                    <Switch defaultChecked />
                  </ListItem>
                </List>
              </Box>
            </TabPanel>
          </Paper>
        </Container>
      </Box>
    </div>
  );
} 