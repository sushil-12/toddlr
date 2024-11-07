const RequestLog = require('../models/RequestLog'); // Assuming you have a RequestLog model

const logRequestAndResponse = async (req, res, next) => {
    const start = Date.now(); // Start timestamp to calculate response time
    const originalSend = res.send; // Save the original send function

    // Initialize a default log entry object
    let logEntry = {
        request: {
            method: req.method,
            url: req.originalUrl,
            headers: req.headers,
            body: req.body,
            timestamp: new Date().toISOString()
        },
        response: {
            statusCode: null,
            responseBody: null,
            responseTime: null
        }
    };

    // Override the res.send method to capture response details
    res.send = function (body) {
        // Calculate response time
        const responseTime = Date.now() - start;

        // Ensure that statusCode is a valid number (fallback to 500 if it's invalid)
        const statusCode = (res.statusCode && !isNaN(res.statusCode)) ? res.statusCode : 500;

        logEntry.response.statusCode = statusCode;
        logEntry.response.responseBody = body;
        logEntry.response.responseTime = responseTime;

        // Save log entry to DB (you can modify this logic if needed)
        RequestLog.create(logEntry)
            .then(() => {
                // Send the response body
                originalSend.call(res, body);
            })
            .catch((err) => {
                console.error('Error saving log entry:', err);
                originalSend.call(res, body); // Ensure we send the response even if the log fails
            });
    };

    next();
};

module.exports = logRequestAndResponse;
