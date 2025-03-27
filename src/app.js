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
const Applinks = require('./models/Applinks');
const { renderDashboard } = require('./controllers/AdminDashboardController');
const exphbs = require('express-handlebars');
const Order = require('./models/Order');

const hbs = exphbs.create({
  helpers: {
    json: function (context) {
      return JSON.stringify(context, null, 2); // Pretty print JSON
    },
    and: (a, b) => a && b,
    not: (a) => !a,
    ifEquals: (arg1, arg2, options) =>
      arg1 === arg2 ? options.fn(this) : options.inverse(this),
    getFirstNonNull: function () {
      // Return the first non-null value
      for (let i = 0; i < arguments.length; i++) {
        if (arguments[i] !== null && arguments[i] !== undefined) {
          return arguments[i];
        }
      }
      return null;  // Return null if all are null or undefined
    }
  }
});


const app = express();

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

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
app.use(express.json({ limit: '25mb' }));  // Set payload size to 150kb
app.use(express.urlencoded({ limit: '25mb', extended: true }));
app.use(bodyParser.json());
app.use(cors('*'));
app.use(sanitizeInput);
app.use(useragent.express());

app.use(passport.initialize());
app.use(passport.session());
app.use((req, res, next) => {
  console.log(`API Called: ${req.method} ${req.originalUrl}`);
  next();
});
// Applying the rate limiter to all requests
// app.use(limiter);

// Serve static assets
// app.use(logRequestAndResponse);
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
// Route to display the admin dashboard
app.get('/admin/dashboard', renderDashboard);

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


// Routes
app.get('/app-links', async (req, res) => {
  try {
    const applinks = await Applinks.find().sort({ 'request.timestamp': -1 });
    res.render('index', { applinks, title: "App Links List" });
  } catch (err) {
    console.error('Error fetching logs:', err);
    res.status(500).send("Error fetching logs from the database.");
  }
});

app.get('/app-card', async (req, res) => {
  try {
    // Fetch all applinks sorted by the request timestamp
    const applinks = await Applinks.find().sort({ 'request.timestamp': -1 });

    // Render the 'cards' view and pass the applinks data
    res.render('cards', { applinks });
  } catch (err) {
    console.error('Error fetching app links:', err);
    res.status(500).send('Error fetching app links');
  }
});

// GET route to display the form to add a new app link
app.get('/applinks/new', (req, res) => {
  res.render('new', { title: "Add New App Link" });
});

// POST route to create a new app link
app.post('/applinks', async (req, res) => {
  const { platform, url, description } = req.body;
  try {
    const newApplink = new Applinks({ platform, url, description });
    await newApplink.save();
    res.redirect('/app-links');
  } catch (err) {
    console.error('Error creating app link:', err);
    res.status(500).send("Error saving the app link.");
  }
});

// GET route to edit an app link
app.get('/applinks/:id/edit', async (req, res) => {
  const { id } = req.params;
  try {
    const applink = await Applinks.findById(id);
    if (!applink) {
      return res.status(404).send("App link not found.");
    }
    res.render('edit', { applink, title: "Edit App Link" });
  } catch (err) {
    console.error('Error fetching app link for editing:', err);
    res.status(500).send("Error fetching app link for editing.");
  }
});

// PUT route to update an app link
app.put('/applinks/:id', async (req, res) => {
  const { id } = req.params;
  const { platform, url, description } = req.body;
  try {
    const updatedApplink = await Applinks.findByIdAndUpdate(id, { platform, url, description }, { new: true });
    if (!updatedApplink) {
      return res.status(404).send("App link not found.");
    }
    res.redirect('/');
  } catch (err) {
    console.error('Error updating app link:', err);
    res.status(500).send("Error updating the app link.");
  }
});

// DELETE route to delete an app link
app.delete('/applinks/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const deletedApplink = await Applinks.findByIdAndDelete(id);
    if (!deletedApplink) {
      return res.status(404).send("App link not found.");
    }
    res.redirect('/');
  } catch (err) {
    console.error('Error deleting app link:', err);
    res.status(500).send("Error deleting the app link.");
  }
});


app.post('/updateOrderStatus/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    // Find the order by ID
    const order = await Order.findById(orderId);
    console.log(order, "order");
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check if status transition is valid
    const validTransitions = {
      Pending: ['Shipped', 'Cancelled'],
      Shipped: ['Delivered'],
      Delivered: [],
      Cancelled: []
    };

    if (validTransitions[order.status].includes(status)) {
      order.status = status; // Update the status
      order.statusLogs.push({ status }); // Update the status logs
      await order.save(); // Save the updated order
      return res.json({ success: true, order: order });
    } else {
      // If invalid transition, return the previous status
      return res.json({ success: false, previousStatus: order.status });
    }
  } catch (err) {
    console.error('Error updating order status:', err);
    return res.status(500).json({ success: false, message: 'Error updating order status' });
  }
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