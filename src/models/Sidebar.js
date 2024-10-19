const mongoose = require('mongoose');

const sidebarSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: { type: Array, required: true } 
});

const Sidebar = mongoose.model('Sidebar', sidebarSchema);

module.exports = Sidebar;