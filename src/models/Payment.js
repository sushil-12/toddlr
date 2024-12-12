const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');


const paymentSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // assuming there's a Parent model
        required: true,
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',  
        required: true,
    },
    offer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer',  
        required: true,
    },
    totalAmount: {
        type: Number,
        reuqired:true
    },
    transactionId: {
        type: String,
        reuqired:true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

paymentSchema.plugin(mongoosePaginate);

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
