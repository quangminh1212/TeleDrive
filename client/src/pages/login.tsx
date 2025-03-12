import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper, 
  Link as MuiLink,
  Grid,
  Divider,
  useTheme,
  CircularProgress,
  Alert
} from '@mui/material';
import Head from 'next/head';
import Link from 'next/link';
import { KeyboardArrowRight, Telegram } from '@mui/icons-material';

export default function Login() {
  const theme = useTheme();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [step, setStep] = useState(1); // 1: Phone number, 2: Verification code
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle phone number submission
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call to send verification code
    setTimeout(() => {
      setLoading(false);
      if (phoneNumber) {
        setStep(2);
      } else {
        setError('Vui lòng nhập số điện thoại của bạn');
      }
    }, 1500);
  };

  // Handle verification code submission
  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Simulate API call to verify code
    setTimeout(() => {
      setLoading(false);
      if (verificationCode) {
        // Redirect to dashboard on successful login
        window.location.href = '/dashboard';
      } else {
        setError('Vui lòng nhập mã xác minh');
      }
    }, 1500);
  };

  return (
    <>
      <Head>
        <title>Đăng nhập - TeleDrive</title>
      </Head>
      <Container maxWidth="sm">
        <Box 
          sx={{ 
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: 8
          }}
        >
          <Box 
            sx={{ 
              mb: 4, 
              textAlign: 'center' 
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 'bold',
                color: theme.palette.primary.main,
                mb: 1
              }}
            >
              TeleDrive
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Lưu trữ đám mây không giới hạn với API Telegram
            </Typography>
          </Box>

          <Paper
            elevation={3}
            sx={{
              p: 4,
              borderRadius: 2,
            }}
          >
            <Typography
              variant="h5"
              component="h2"
              align="center"
              gutterBottom
              fontWeight="500"
            >
              {step === 1 ? 'Đăng nhập với Telegram' : 'Nhập mã xác minh'}
            </Typography>

            {/* Phone number form */}
            {step === 1 && (
              <form onSubmit={handlePhoneSubmit}>
                <TextField
                  label="Số điện thoại Telegram"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+84 123 456 789"
                  required
                  autoFocus
                />

                {error && (
                  <Alert severity="error" sx={{ my: 2 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <KeyboardArrowRight />}
                  disabled={loading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {loading ? 'Đang xử lý...' : 'Tiếp tục'}
                </Button>

                <Divider sx={{ my: 3 }}>hoặc</Divider>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Telegram />}
                  size="large"
                  onClick={() => console.log('QR login')}
                >
                  Đăng nhập với QR Code
                </Button>
              </form>
            )}

            {/* Verification code form */}
            {step === 2 && (
              <form onSubmit={handleVerificationSubmit}>
                <Typography paragraph color="text.secondary" sx={{ mb: 3 }}>
                  Chúng tôi đã gửi mã xác minh đến số điện thoại{' '}
                  <Box component="span" fontWeight="bold">
                    {phoneNumber}
                  </Box>
                </Typography>

                <TextField
                  label="Mã xác minh"
                  fullWidth
                  margin="normal"
                  variant="outlined"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  autoFocus
                />

                {error && (
                  <Alert severity="error" sx={{ my: 2 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <KeyboardArrowRight />}
                  disabled={loading}
                  sx={{ mt: 3, mb: 2 }}
                >
                  {loading ? 'Đang xác minh...' : 'Xác minh & Đăng nhập'}
                </Button>

                <Grid container>
                  <Grid item xs>
                    <MuiLink
                      component="button"
                      variant="body2"
                      onClick={() => setStep(1)}
                      sx={{ cursor: 'pointer' }}
                    >
                      Thay đổi số điện thoại
                    </MuiLink>
                  </Grid>
                  <Grid item>
                    <MuiLink
                      component="button"
                      variant="body2"
                      onClick={() => console.log('Resend code')}
                      sx={{ cursor: 'pointer' }}
                    >
                      Gửi lại mã
                    </MuiLink>
                  </Grid>
                </Grid>
              </form>
            )}
          </Paper>

          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Chưa có tài khoản Telegram?{' '}
              <MuiLink href="https://telegram.org/" target="_blank" rel="noopener">
                Đăng ký ngay
              </MuiLink>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              <Link href="/" passHref>
                <MuiLink>Quay lại trang chủ</MuiLink>
              </Link>
            </Typography>
          </Box>
        </Box>
      </Container>
    </>
  );
} 