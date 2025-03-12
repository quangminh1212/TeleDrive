import React from 'react';
import {
  Box,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  CloudUpload as CloudUploadIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Image as ImageIcon,
  Movie as VideoIcon,
  Description as DocumentIcon,
  AudioFile as AudioIcon,
  Archive as ArchiveIcon,
  Home as HomeIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface SidebarProps {
  width?: number;
}

const Sidebar: React.FC<SidebarProps> = ({ width = 250 }) => {
  const theme = useTheme();
  const router = useRouter();
  
  // Check if the current path matches the item path
  const isActive = (path: string) => router.pathname === path;

  return (
    <Box sx={{ width }}>
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
        <Link href="/" passHref>
          <ListItem 
            button 
            component="a" 
            selected={isActive('/')}
          >
            <ListItemIcon>
              <HomeIcon />
            </ListItemIcon>
            <ListItemText primary="Trang chủ" />
          </ListItem>
        </Link>
        <Link href="/dashboard" passHref>
          <ListItem 
            button 
            component="a" 
            selected={isActive('/dashboard')}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Tất cả file" />
          </ListItem>
        </Link>
        <ListItem 
          button 
          selected={isActive('/folders')}
          onClick={() => router.push('/folders')}
        >
          <ListItemIcon>
            <FolderIcon />
          </ListItemIcon>
          <ListItemText primary="Thư mục của tôi" />
        </ListItem>
        <ListItem 
          button 
          selected={isActive('/images')}
          onClick={() => router.push('/images')}
        >
          <ListItemIcon>
            <ImageIcon />
          </ListItemIcon>
          <ListItemText primary="Hình ảnh" />
        </ListItem>
        <ListItem 
          button 
          selected={isActive('/videos')}
          onClick={() => router.push('/videos')}
        >
          <ListItemIcon>
            <VideoIcon />
          </ListItemIcon>
          <ListItemText primary="Video" />
        </ListItem>
        <ListItem 
          button 
          selected={isActive('/documents')}
          onClick={() => router.push('/documents')}
        >
          <ListItemIcon>
            <DocumentIcon />
          </ListItemIcon>
          <ListItemText primary="Tài liệu" />
        </ListItem>
        <ListItem 
          button 
          selected={isActive('/audio')}
          onClick={() => router.push('/audio')}
        >
          <ListItemIcon>
            <AudioIcon />
          </ListItemIcon>
          <ListItemText primary="Âm thanh" />
        </ListItem>
        <ListItem 
          button 
          selected={isActive('/archives')}
          onClick={() => router.push('/archives')}
        >
          <ListItemIcon>
            <ArchiveIcon />
          </ListItemIcon>
          <ListItemText primary="Lưu trữ" />
        </ListItem>
      </List>
      
      <Divider />
      
      <List>
        <ListItem 
          button 
          selected={isActive('/upload')}
          onClick={() => router.push('/upload')}
        >
          <ListItemIcon>
            <CloudUploadIcon />
          </ListItemIcon>
          <ListItemText primary="Tải lên" />
        </ListItem>
        <Link href="/settings" passHref>
          <ListItem 
            button 
            component="a" 
            selected={isActive('/settings')}
          >
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Cài đặt" />
          </ListItem>
        </Link>
        <ListItem 
          button 
          onClick={() => {
            // Handle logout logic here
            console.log('Logout');
            router.push('/login');
          }}
        >
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Đăng xuất" />
        </ListItem>
      </List>
    </Box>
  );
};

export default Sidebar; 