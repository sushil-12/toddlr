const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;
const DailyRotateFile = require('winston-daily-rotate-file');

// Define custom format for logs with a separator
const customFormat = printf(({ level, message, timestamp }) => {
    return `[${timestamp} ${level}]: ${message}\n---\n`;
});

// Define the log directory and log file path in the /tmp directory
const logDir = process.env.APP_ENV === 'local' ? path.join(__dirname, 'logs') : '/tmp/logs';
const logFilePath = path.join(logDir, 'hegroup-cms-%DATE%.log');



// Ensure the directories exist
try {
    fs.mkdirSync(logDir, { recursive: true });
} catch (err) {
    console.error('Error creating log directories:', err);
}

// Create general logger instance
const logger = createLogger({
    level: 'error', // Log only error level and below
    format: combine(
        colorize(), // Add colors to the console output
        timestamp(),
        customFormat
    ),
    transports: [
        new DailyRotateFile({
            filename: logFilePath,
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m', // 20 megabytes
            maxFiles: '14d' // Keep logs for 14 days
        }),
        // Uncomment to add console transport for debugging
        // new transports.Console({
        //     level: 'error', // Log only error level and below to the console
        //     format: combine(
        //         timestamp(),
        //         customFormat
        //     )
        // })
    ],
});

// Create contact logger instance
const contactLogDir = process.env.APP_ENV === 'local' ? path.join(__dirname, 'logs', 'contact') : '/tmp/logs/contact';
const contactLogFilePath = path.join(contactLogDir, 'contact-api-%DATE%.log');
console.log("contactLogFilePath", contactLogFilePath,   process.env.APP_ENV )
// Ensure the contact log directory exists
try {
    fs.mkdirSync(contactLogDir, { recursive: true });
} catch (err) {
    console.error('Error creating contact log directory:', err);
}

// Create contact logger instance
const contactLogger = createLogger({
    level: 'info', // Adjust log level as needed
    format: combine(
        colorize(), // Add colors to the console output
        timestamp(),
        customFormat
    ),
    transports: [
        new DailyRotateFile({
            filename: contactLogFilePath,
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m', // 20 megabytes
            maxFiles: '14d' // Keep logs for 14 days
        }),
        // Uncomment to add console transport for debugging
        // new transports.Console({
        //     level: 'info', // Adjust log level as needed
        //     format: combine(
        //         timestamp(),
        //         customFormat
        //     )
        // })
    ],
});

module.exports = { logger, contactLogger };
