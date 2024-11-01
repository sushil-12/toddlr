const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');

const productSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // assuming there's a Parent model
        required: true,
    },
    images: {
        type: [String], // Array of URLs or base64 strings for images
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        enum: ["cloths", "toys", "care", "books", "outdoor"],
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    size: {
        type: String,
        enum: ["small", "medium", "large"],
        required: true,
    },
    description: {
        type: String,
        trim: true,
    },
    age: {
        type: String,
    },
    gender: {
        type: String,
        enum: ["boy", "girl", "all"],
        required: true,
    },
    brand: {
        type: String,
    },
    packageSize: {
        fitsInMailbox: {
            type: Boolean,
            default: false,
        },
        medium: {
            type: Boolean,
            default: false,
        },
        large: {
            type: Boolean,
            default: false,
        },
    },
    condition: {
        type: String,
        enum: ["new", "as_good_as_new", "used"],
        required: true,
    },
    occasion: {
        type: String,
    },
    shareWith: {
        type: String,
        enum: ["followers_only", "everyone"],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

productSchema.plugin(mongoosePaginate);

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
