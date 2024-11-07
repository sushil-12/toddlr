const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema({
  request: {
    method: { type: String, required: false },
    url: { type: String, required: false },
    body: { type: Object, required: false },
    headers: { type: Object, required: false },
    query: { type: Object, required: false },
    params: { type: Object, required: false },
    timestamp: { type: Date, required: false },
  },
  response: {
    statusCode: { type: Number, required: false },
    responseBody: { type: String, required: false },
    responseTime: { type: Number, required: false },
  },
}, { timestamps: false });

module.exports = mongoose.model('RequestLog', requestLogSchema);