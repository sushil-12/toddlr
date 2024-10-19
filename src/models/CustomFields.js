const mongoose = require('mongoose');

const customFieldsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  post_type: { type: String, required: true },
  item_type: { type: String, required: true },
  domain: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  fields: [
    {
      name: { type: String, },
      label: { type: String },
      variant: { type: String },
      field_type: { type: String },
      required: { type: Boolean },
      repeatable: { type: Boolean },
      placeholder: { type: String },
      nestedFields: { type: Array },
      options: { type: Array },
    },
  ],
}, { timestamps: true });

const CustomField = mongoose.model('CustomField', customFieldsSchema);
module.exports = CustomField;