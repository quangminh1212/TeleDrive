import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  InputBase,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Badge,
  Box,
  useTheme,
  alpha
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
  Help as HelpIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useRouter } from 'next/router';

// Styled components
const SearchWrapper = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
      '&:focus': {
        width: '30ch',
      },
    },
  },
}));

interface HeaderProps {
  onSidebarToggle: () => void;
  title?: string;
}

const Header: React.FC<HeaderProps> = ({ onSidebarToggle, title = 'TeleDrive' }) => {
  const theme = useTheme();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Handle profile menu open
  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  // Handle notifications menu open
  const handleNotificationsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
    setNotificationsAnchorEl(null);
  };

  // Handle search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // Implement search logic
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Handle navigation to profile
  const navigateToProfile = () => {
    router.push('/profile');
    handleMenuClose();
  };

  // Handle navigation to settings
  const navigateToSettings = () => {
    router.push('/settings');
    handleMenuClose();
  };

  // Handle logout
  const handleLogout = () => {
    console.log('Logging out...');
    // Implement logout logic
    router.push('/login');
    handleMenuClose();
  };

  return (
    <AppBar position="fixed" color="default" elevation={1}>
      <Toolbar>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="open drawer"
          onClick={onSidebarToggle}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography
          variant="h6"
          noWrap
          component="div"
          sx={{ display: { xs: 'none', sm: 'block' } }}
        >
          {title}
        </Typography>
        
        <SearchWrapper>
          <form onSubmit={handleSearchSubmit}>
            <SearchIconWrapper>
              <SearchIcon />
            </SearchIconWrapper>
            <StyledInputBase
              placeholder="Tìm kiếm file..."
              inputProps={{ 'aria-label': 'search' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </SearchWrapper>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <Box sx={{ display: 'flex' }}>
          <IconButton
            color="inherit"
            onClick={handleNotificationsMenuOpen}
          >
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <IconButton
            edge="end"
            aria-label="account of current user"
            aria-haspopup="true"
            onClick={handleProfileMenuOpen}
            color="inherit"
          >
            <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
              <AccountCircle />
            </Avatar>
          </IconButton>
        </Box>
      </Toolbar>
      
      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        id="profile-menu"
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { minWidth: 200 }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: theme.palette.primary.main, mr: 2 }}>
            <AccountCircle />
          </Avatar>
          <Box>
            <Typography variant="body1" fontWeight="medium">Nguyễn Văn A</Typography>
            <Typography variant="body2" color="text.secondary">nguyenvana@example.com</Typography>
          </Box>
        </Box>
        
        <Divider />
        
        <MenuItem onClick={navigateToProfile}>
          <PersonIcon sx={{ mr: 2 }} fontSize="small" />
          Hồ sơ
        </MenuItem>
        
        <MenuItem onClick={navigateToSettings}>
          <SettingsIcon sx={{ mr: 2 }} fontSize="small" />
          Cài đặt
        </MenuItem>
        
        <MenuItem onClick={() => {window.open('https://support.teledrive.com', '_blank'); handleMenuClose();}}>
          <HelpIcon sx={{ mr: 2 }} fontSize="small" />
          Trợ giúp
        </MenuItem>
        
        <Divider />
        
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 2 }} fontSize="small" />
          Đăng xuất
        </MenuItem>
      </Menu>
      
      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationsAnchorEl}
        id="notifications-menu"
        keepMounted
        open={Boolean(notificationsAnchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 3,
          sx: { minWidth: 300, maxWidth: 350 }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="medium">Thông báo</Typography>
          <IconButton size="small" onClick={handleMenuClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        
        <Divider />
        
        <MenuItem>
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              Tải lên hoàn tất
            </Typography>
            <Typography variant="body2" color="text.secondary">
              File "Tài liệu.docx" đã được tải lên thành công.
            </Typography>
            <Typography variant="caption" color="text.disabled">
              2 phút trước
            </Typography>
          </Box>
        </MenuItem>
        
        <MenuItem>
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              Chia sẻ mới
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Anh Bình đã chia sẻ "Project Plan.xlsx" với bạn.
            </Typography>
            <Typography variant="caption" color="text.disabled">
              1 giờ trước
            </Typography>
          </Box>
        </MenuItem>
        
        <MenuItem>
          <Box sx={{ py: 1 }}>
            <Typography variant="body2" fontWeight="medium">
              Cảnh báo bảo mật
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Đăng nhập mới được phát hiện trên thiết bị lạ.
            </Typography>
            <Typography variant="caption" color="text.disabled">
              Hôm qua
            </Typography>
          </Box>
        </MenuItem>
        
        <Divider />
        
        <Box sx={{ p: 1, textAlign: 'center' }}>
          <Typography 
            variant="body2" 
            color="primary" 
            sx={{ cursor: 'pointer', py: 1 }}
            onClick={() => {router.push('/notifications'); handleMenuClose();}}
          >
            Xem tất cả thông báo
          </Typography>
        </Box>
      </Menu>
    </AppBar>
  );
};

export default Header; 