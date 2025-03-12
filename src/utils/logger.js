const winston = require('winston');
const path = require('path');
const fs = require('fs-extra');

// Đảm bảo thư mục logs tồn tại
fs.ensureDirSync(path.join(process.cwd(), 'logs'));

// Tạo format cho logger
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
);

// Thiết lập logger
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        new winston.transports.File({ 
            filename: path.join(process.cwd(), 'logs', 'error.log'), 
            level: 'error' 
        }),
        new winston.transports.File({ 
            filename: path.join(process.cwd(), 'logs', 'combined.log') 
        })
    ]
});

module.exports = logger; 