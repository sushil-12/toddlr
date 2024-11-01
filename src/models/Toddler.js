const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ToddlerSchema = new Schema({
  parentId: {
    type: Schema.Types.ObjectId,
    ref: 'Parent',  // assuming there's a Parent model
    required: true,
  },
  childName: {
    type: String,
    required: true,
  },
  gender: {
    type: String,
    enum: ['boy', 'girl', 'other','prefer_not_to_say'],
    required: true,
  },
  birthDate: {
    type: Date,
    default: null,
  },
  profilePhotoPath: {
    type: String,
    default: '',
  },
  isExpecting: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Toddler', ToddlerSchema);
