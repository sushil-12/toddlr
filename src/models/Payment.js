const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');


const paymentSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',  
    },
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',  
    },
    bundleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bundle',  
    },
    totalAmount: {
        type: Number,
        reuqired:true
    },
    transactionId: {
        type: String,
        reuqired:true
    },
    paymentStatus:{
        type: String,
        required:true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

paymentSchema.plugin(mongoosePaginate);

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
