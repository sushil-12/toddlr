const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "../../logs/debug.log");

// Middleware to log request details
const logRequest = (req, res, next) => {
    const logEntry = `[${new Date().toISOString()}] REQUEST: ${req.method} ${req.originalUrl
        } - Body: ${JSON.stringify(req.body)} - Params: ${JSON.stringify(req.params)}\n`;

    fs.appendFileSync(logFilePath, logEntry);
    next();
};

// Function to log response
const logResponse = (req, data) => {
    const logEntry = `[${new Date().toISOString()}] RESPONSE: ${req.method} ${req.originalUrl
        } - Data: ${JSON.stringify(data)}\n`;

    fs.appendFileSync(logFilePath, logEntry);
};

// Function to log errors
const logError = (req, error) => {
    const logEntry = `[${new Date().toISOString()}] ERROR: ${req.method} ${req.originalUrl
        } - Error: ${error.message}\n`;

    fs.appendFileSync(logFilePath, logEntry);
};
module.exports = { logRequest, logResponse, logError };