const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    },
    bundle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bundle',
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: false,
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined', 'counter'], // Predefined values
        default: 'pending', // Default status
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('Offer', OfferSchema);
