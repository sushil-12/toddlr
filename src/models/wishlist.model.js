const { Schema, model } = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
const wishlistSchema = new Schema({
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
    },
    slug: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
    },
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }]
}, {
    timestamps: true
});

// Ensure unique title and slug per createdBy (user)
wishlistSchema.index({ createdBy: 1, title: 1 }, { unique: true });
wishlistSchema.index({ createdBy: 1, slug: 1 }, { unique: true });

wishlistSchema.plugin(mongoosePaginate);
const Wishlist = model('Wishlist', wishlistSchema);

module.exports = Wishlist;