import { Request, Response, NextFunction } from 'express';
import logger from './logger';

/**
 * Class quản lý lỗi tùy chỉnh
 */
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Xử lý lỗi trong môi trường phát triển
 */
const handleErrorDev = (err: AppError, res: Response) => {
  logger.error(`ERROR 💥: ${err.message}`, { stack: err.stack });
  
  return res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Xử lý lỗi trong môi trường production
 */
const handleErrorProd = (err: AppError, res: Response) => {
  // Lỗi hoạt động, tin cậy: gửi thông báo đến client
  if (err.isOperational) {
    logger.error(`ERROR 💥: ${err.message}`);
    
    return res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message,
    });
  }
  
  // Lỗi không xác định (lỗi chương trình/thư viện): không gửi chi tiết lỗi
  logger.error('ERROR 💥', err);
  
  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'Đã xảy ra lỗi! Vui lòng thử lại sau.',
  });
};

/**
 * Middleware xử lý lỗi toàn cục
 */
export const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  const error = err as AppError;
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    handleErrorDev(error, res);
  } else {
    // Trong môi trường production sẽ xử lý các loại lỗi cụ thể trước khi xử lý chung
    handleErrorProd(error, res);
  }
};

/**
 * Wrapper function để bắt lỗi async
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}; 