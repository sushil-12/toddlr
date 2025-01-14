const mongoose = require('mongoose');

const coachSchema = new mongoose.Schema({
  coachName: {
    type: String,
    required: true,
    unique: false, // Ensure the coach name is unique
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // References the associated user
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true, // Default to active coach
  },
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set the creation date
  },
  updatedAt: {
    type: Date,
    default: Date.now, // Automatically set the update date
  },
});

const Coach = mongoose.model('Coach', coachSchema);

module.exports = Coach;
