// models/Applinks.js
const mongoose = require('mongoose');

const applinkSchema = new mongoose.Schema({
  platform: { type: String, enum: ['iOS', 'Web', 'android'], required: true },
  url: { type: String, required: true },
  description: { type: String },
  request: {
    timestamp: { type: Date, default: Date.now }
  }
});

const Applinks = mongoose.model('Applinks', applinkSchema);
module.exports = Applinks;
