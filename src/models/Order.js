const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderDate: {
        type: Date,
        default: Date.now
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    },
    paymentId: {
        type: String,
        required: true
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
    },
    bundleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bundle',
        default: null
    },
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    statusLogs: [{
        status: {
            type: String,
            enum: ['Pending', 'Shipped', 'Delivered', 'Cancelled'],
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        }
    }],
    receivedInGoodCondition: {
        type: Boolean,
        default: false
    },
    orderRating: {
        type: Number,
        min: 0,
        max: 5,
        default: 0
    },
    orderReviewDone: {
        type: Boolean,
        default: false
    },
    orderReview: {
        type: String,
        default: ''
    }
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
