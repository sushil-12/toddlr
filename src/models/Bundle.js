const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');

const cartProductsSchema = new mongoose.Schema({
    productId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required:true
    },
    price: {
        type: Number,
        required: true
    },
    quantity:{
        type: Number,
        required: true
    }
})

const bundleSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // assuming there's a Parent model
        required: true,
    },
    products:[cartProductsSchema],
    
    totalAmount: {
        type: Number,
        reuqired:true
    },
    status: {
        type: String,
        enum: ['pending', 'executed'], // Predefined values
        default: 'pending', // Default status
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

bundleSchema.plugin(mongoosePaginate);

const Bundle = mongoose.model("Bundle", bundleSchema);
module.exports = Bundle;
