const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  participants: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ],
  messages: [
    {
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      content: { type: mongoose.Schema.Types.Mixed, required: true }, // To store flexible message content
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

const Chat = mongoose.model('Chat', ChatSchema);

module.exports = Chat;