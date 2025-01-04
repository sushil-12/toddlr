const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderDate: {
        type: Date,
        default: Date.now
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
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
    }]
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
