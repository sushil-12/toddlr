const mongoose = require('mongoose');

// Define a sub-schema for menu items
const menuItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  imgURL: { type: String, required: true },
  route: { type: String, required: true },
  label: { type: String, required: true },
  category: { type: Boolean, required: true },
  type: { type: String, required: true }
});

// Website schema for storing website information
const websiteSchema = new mongoose.Schema({
  icon: { type: String },
  business_name: { type: String, required: true },
  url: { type: String, required: true },
  description: { type: String },
  menus: { type: [menuItemSchema], required: true }, // Define menus field as an array of menuItemSchema
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const Website = mongoose.model('Website', websiteSchema);
module.exports = Website;