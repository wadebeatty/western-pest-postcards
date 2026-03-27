const winston = require('winston');
const path = require('path');
const fs = require('fs').promises;

// Create logs directory if it doesn't exist
(async () => {
  try {
    await fs.mkdir(path.join(__dirname, '../logs'), { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error);
  }
})();

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'western-pest-postcards' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write all errors to error.log
    new winston.transports.File({ 
      filename: path.join(__dirname, '../logs/error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Add daily rotation for combined logs
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d'
  }));
}

// Create a simple log function for quick debugging
logger.simple = (message, meta = {}) => {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[${timestamp}] ${message}${metaStr}`);
};

// Log uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit in development
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = logger;