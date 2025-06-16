/**
 * Script để khởi tạo dữ liệu ban đầu cho ứng dụng
 * 
 * Chạy: npx ts-node src/scripts/init-db.ts
 */

import mongoose from 'mongoose';
import config from '../config';
import User from '../models/user.model';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

// Kết nối đến MongoDB
async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    logger.info('Đã kết nối thành công đến MongoDB');
  } catch (error) {
    logger.error('Lỗi kết nối đến MongoDB:', error);
    process.exit(1);
  }
}

// Tạo thư mục uploads và logs nếu chưa tồn tại
async function createDirectories() {
  const dirs = ['uploads', 'logs'];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
      logger.info(`Đã tạo thư mục ${dir}`);
    }
  }
}

// Tạo tài khoản admin mặc định
async function createAdminUser() {
  try {
    // Kiểm tra xem đã có admin chưa
    const adminExists = await User.findOne({ email: 'admin@teledrive.io' });
    
    if (!adminExists) {
      await User.create({
        fullName: 'Admin TeleDrive',
        email: 'admin@teledrive.io',
        password: 'Admin@123',
        isAdmin: true,
      });
      
      logger.info('Đã tạo tài khoản admin mặc định:');
      logger.info('Email: admin@teledrive.io');
      logger.info('Password: Admin@123');
      logger.info('*** LƯU Ý: Hãy đổi mật khẩu sau khi đăng nhập lần đầu ***');
    } else {
      logger.info('Tài khoản admin đã tồn tại, bỏ qua bước tạo admin');
    }
  } catch (error) {
    logger.error('Lỗi khi tạo tài khoản admin:', error);
  }
}

// Hàm chính
async function main() {
  try {
    logger.info('== Bắt đầu khởi tạo dữ liệu ==');
    
    // Tạo thư mục cần thiết
    await createDirectories();
    
    // Kết nối DB
    await connectDB();
    
    // Tạo dữ liệu ban đầu
    await createAdminUser();
    
    logger.info('== Khởi tạo dữ liệu hoàn tất ==');
    process.exit(0);
  } catch (error) {
    logger.error('Lỗi trong quá trình khởi tạo:', error);
    process.exit(1);
  }
}

// Chạy hàm chính
main(); 