const express = require('express');
const bodyParser = require('body-parser');
const authRoutes = require('./routes/authRoutes');
const protectedRoutes = require('./routes/protectedUserRoutes');
const commonRoutes = require('./routes/commanRoutes');
const { CustomError, ErrorHandler, ResponseHandler } = require('./utils/responseHandler');
const connectDB = require('./config/database');
const useragent = require('express-useragent');
const cors = require('cors');
const corsOptions = require("./constants/cors");
const { HTTP_STATUS_CODES } = require('./constants/error_message_codes');
const path = require('path');
const fs = require('fs');
const sanitizeInput = require('./middleware/sanitizeRequest');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const session = require('express-session');
const logRequestAndResponse = require('./middleware/logRequestAndResponse');
const { getLogs } = require('./controllers/common/LogController');

const app = express();

// Connect to MongoDB
connectDB();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        status: 'error',
        code: 429,
        message: 'Too many requests, please try again later.'
    },
    headers: true, // Send rate limit header info
});

app.use(session({
    secret: process.env.JWT_SECRET || 'your_secret_key', // Replace with a strong secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to true if using HTTPS
}));
// Middleware
app.use(express.json({ limit: '5mb' }));  // Set payload size to 150kb
app.use(express.urlencoded({ limit: '5mb', extended: true }));
app.use(bodyParser.json());
app.use(cors(corsOptions));
app.use(sanitizeInput);
app.use(useragent.express());

app.use(passport.initialize());
app.use(passport.session());

// Applying the rate limiter to all requests
// app.use(limiter);

// Serve static assets
app.use(logRequestAndResponse);
app.get('/logs', getLogs);

app.use('/assets', express.static(path.join(__dirname, 'src', 'assets')));
// Set Handlebars as the view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
// Authentication routes
app.use('/auth', authRoutes);

// Common routes
app.use('/api/common', commonRoutes);

// Protected routes
app.use('/api', protectedRoutes);

// Root route
app.get('/', (req, res) => {
    res.send('Hey this is my toddlr API running 🥳');
});
app.get('/privacy-policy', (req, res) => {
    res.render('privacyPolicy');
});

app.get('/terms-and-conditions', (req, res) => {
    res.render('termsAndConditions');
});

// SVG upload route
app.post('/upload/svg', (req, res) => {
    const { name, code } = req.body;
    const currentJson = path.join(__dirname, 'constants', 'svg_codes.json');
    if (!name || !code) {
        return res.status(400).json({ error: 'SVG name and code are required' });
    }

    // Read the existing JSON file
    fs.readFile(currentJson, (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return res.status(500).send('Error reading file');
        }

        let svgData = {};
        try {
            // Parse the existing JSON content
            svgData = JSON.parse(data);
        } catch (parseErr) {
            console.error('Error parsing JSON:', parseErr);
            return res.status(500).send('Error parsing JSON');
        }

        // Append the new SVG data
        svgData[name] = code;

        const jsonString = JSON.stringify(svgData, null, 2);

        // Write back to the JSON file
        fs.writeFile(currentJson, jsonString, (writeErr) => {
            if (writeErr) {
                console.error('Error writing file:', writeErr);
                return res.status(500).send('Error writing file');
            }
            ResponseHandler.success(res, { message: 'SVG Added Successfully' }, HTTP_STATUS_CODES.CREATED);
        });
    });
});

// 404 Error Handler
app.use((req, res, next) => {
    ErrorHandler.handleNotFound(res);
});

// Generic Error Handler
app.use((err, req, res, next) => {
    ErrorHandler.handleError(err, res);
});

module.exports = app;