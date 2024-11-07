const RequestLog = require("../../models/RequestLog");

// GET route to fetch and render the logs
const appLinks = async (req, res) => {
  try {
    // Fetch logs from the database, sorted by timestamp (most recent first)
    const logs = await Applinks.find().sort({ 'request.timestamp': -1 });
    // Render the 'logs' view with the fetched logs
    res.render('logs', { 
      logs, 
      title: "API Request Logs"
    });
  } catch (err) {
    // Handle any errors that occur while fetching the logs
    console.error('Error fetching logs:', err);
    res.status(500).send("Error fetching logs from the database.");
  }
};

// GET route to fetch and render the logs
const getLogs = async (req, res) => {
  try {
    // Fetch logs from the database, sorted by timestamp (most recent first)
    const logs = await RequestLog.find().sort({ 'request.timestamp': -1 });
    // Render the 'logs' view with the fetched logs
    res.render('logs', { 
      logs, 
      title: "API Request Logs"
    });
  } catch (err) {
    // Handle any errors that occur while fetching the logs
    console.error('Error fetching logs:', err);
    res.status(500).send("Error fetching logs from the database.");
  }
};

module.exports = {
  getLogs
};