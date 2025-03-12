import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import session from 'express-session';
import FileStore from 'session-file-store';
import fs from 'fs-extra';
import morgan from 'morgan';

// Load environment variables
dotenv.config();

// Đảm bảo thư mục data tồn tại
const dataPath = process.env.DATA_PATH || './data';
fs.ensureDirSync(dataPath);
fs.ensureDirSync(path.join(dataPath, 'sessions'));
fs.ensureDirSync(path.join(dataPath, 'users'));
fs.ensureDirSync(path.join(dataPath, 'files'));
fs.ensureDirSync(path.join(dataPath, 'folders'));

// Initialize Express
const app = express();
const PORT = process.env.PORT || 5000;

// Tạo session store
const SessionStore = FileStore(session);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Cấu hình session
app.use(session({
  store: new SessionStore({ 
    path: path.join(dataPath, 'sessions'),
    ttl: 86400, // 1 ngày
    reapInterval: 3600 // 1 giờ
  }),
  secret: process.env.SESSION_SECRET || 'teledriveSecretKey123',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 ngày
  }
}));

// API Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 