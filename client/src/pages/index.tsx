import React from 'react';
import Head from 'next/head';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  Grid, 
  Paper,
  Card,
  CardContent,
  CardMedia,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  CloudUpload, 
  Security, 
  Speed, 
  Devices, 
  Check,
  CloudDownload
} from '@mui/icons-material';

// Landing page component
export default function Home() {
  return (
    <div>
      <Head>
        <title>TeleDrive - Lưu trữ đám mây không giới hạn</title>
        <meta name="description" content="Lưu trữ đám mây không giới hạn với Telegram" />
      </Head>

      {/* Hero Section */}
      <Box
        sx={{
          bgcolor: 'primary.main',
          color: 'white',
          pt: 12,
          pb: 8,
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
                Lưu trữ đám mây không giới hạn
              </Typography>
              <Typography variant="h5" paragraph>
                Sử dụng API Telegram để lưu trữ file của bạn, miễn phí và không giới hạn dung lượng.
              </Typography>
              <Box sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    mr: 2,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.9)',
                    },
                  }}
                >
                  Bắt Đầu Ngay
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  sx={{
                    color: 'white',
                    borderColor: 'white',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255, 255, 255, 0.1)',
                    },
                  }}
                >
                  Tìm Hiểu Thêm
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src="/hero-image.png"
                  alt="TeleDrive Cloud Storage"
                  sx={{
                    width: '100%',
                    maxWidth: 500,
                    height: 'auto',
                    borderRadius: 2,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 10 }}>
        <Box textAlign="center" mb={8}>
          <Typography variant="h3" component="h2" fontWeight="bold" gutterBottom>
            Tại sao chọn TeleDrive?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 800, mx: 'auto' }}>
            Giải pháp lưu trữ đám mây miễn phí, không giới hạn và an toàn cho tất cả file của bạn
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 4, height: '100%', borderRadius: 4, border: '1px solid #eee' }}>
              <CloudUpload color="primary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" component="h3" fontWeight="bold" gutterBottom>
                Lưu trữ không giới hạn
              </Typography>
              <Typography color="text.secondary">
                API của Telegram cho phép lưu trữ không giới hạn các file, tài liệu và media của bạn
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 4, height: '100%', borderRadius: 4, border: '1px solid #eee' }}>
              <Security color="primary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" component="h3" fontWeight="bold" gutterBottom>
                Bảo mật cao
              </Typography>
              <Typography color="text.secondary">
                Các file của bạn được mã hóa và bảo vệ bởi các biện pháp bảo mật của Telegram
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 4, height: '100%', borderRadius: 4, border: '1px solid #eee' }}>
              <Speed color="primary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h5" component="h3" fontWeight="bold" gutterBottom>
                Tốc độ cao
              </Typography>
              <Typography color="text.secondary">
                Không có giới hạn về tốc độ tải lên và tải xuống, sử dụng đầy đủ băng thông của bạn
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        <Box textAlign="center" mt={10}>
          <Typography variant="h4" component="h2" fontWeight="bold" gutterBottom>
            Một cách tuyệt vời để lưu trữ và truy cập file của bạn
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 4 }}>
            <Grid item xs={12} md={6}>
              <List>
                {[
                  'Tất cả file được lưu trữ trong tin nhắn đã lưu Telegram của bạn',
                  'Tải lên và tải xuống với tốc độ cao',
                  'Truy cập file từ mọi thiết bị',
                  'Giao diện người dùng đơn giản, thân thiện',
                  'Tạo thư mục, di chuyển, sao chép và đổi tên file'
                ].map((text, index) => (
                  <ListItem key={index} sx={{ py: 1 }}>
                    <ListItemIcon>
                      <Check color="primary" />
                    </ListItemIcon>
                    <ListItemText primary={text} />
                  </ListItem>
                ))}
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                component="img"
                src="/app-screenshot.png"
                alt="TeleDrive App Screenshot"
                sx={{
                  width: '100%',
                  borderRadius: 2,
                  boxShadow: '0 5px 20px rgba(0, 0, 0, 0.1)',
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 10 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h3" component="h2" fontWeight="bold" gutterBottom>
            Bắt đầu ngay hôm nay
          </Typography>
          <Typography variant="h6" sx={{ mb: 4 }}>
            Đăng nhập bằng tài khoản Telegram và bắt đầu trải nghiệm lưu trữ đám mây không giới hạn
          </Typography>
          <Button
            variant="contained"
            size="large"
            startIcon={<CloudUpload />}
            sx={{
              bgcolor: 'white',
              color: 'primary.main',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.9)',
              },
            }}
          >
            Bắt đầu miễn phí
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#f5f5f5', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                TeleDrive
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Lưu trữ đám mây không giới hạn sử dụng API Telegram.
                Miễn phí, an toàn và nhanh chóng.
              </Typography>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Sản phẩm
              </Typography>
              <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
                {['Tính năng', 'Giới hạn', 'Bảo mật', 'Điều khoản'].map((item) => (
                  <Box component="li" key={item} sx={{ py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={2}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Hỗ trợ
              </Typography>
              <Box component="ul" sx={{ p: 0, m: 0, listStyle: 'none' }}>
                {['FAQ', 'Liên hệ', 'Tài liệu', 'Báo lỗi'].map((item) => (
                  <Box component="li" key={item} sx={{ py: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Đăng ký nhận tin
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Nhận thông báo về các tính năng mới và bản cập nhật
              </Typography>
              <Box sx={{ display: 'flex' }}>
                <Box
                  component="input"
                  placeholder="Email của bạn"
                  sx={{
                    flex: 1,
                    p: 1.5,
                    border: '1px solid #ddd',
                    borderRadius: '8px 0 0 8px',
                    outline: 'none',
                  }}
                />
                <Button
                  variant="contained"
                  sx={{
                    borderRadius: '0 8px 8px 0',
                    boxShadow: 'none',
                  }}
                >
                  Đăng ký
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid #ddd', textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} TeleDrive. Tất cả các quyền được bảo lưu.
            </Typography>
          </Box>
        </Container>
      </Box>
    </div>
  );
} 