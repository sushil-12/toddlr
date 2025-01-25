const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');

const postSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    title: {
        type: String,
        required: function() {
            return this.postType === 'topic' || this.postType === 'story' || this.postType === 'post';
        },
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
    },
    tag: {
        type: String,
    },
    pins: [
        {
            pinnedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', 
                required: true,
            },
            pinnedAt: {
                type: Date,
                default: Date.now, 
            }
        }
    ],
    postType: {
        type: String,
        enum: ["sell_an_item", "story", "post", "topic"],
        required: true,
        default: 'post'
    },
    members: [
        {
            joinedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', 
                required: true,
            },
            joinedAt: {
                type: Date,
                default: Date.now, 
            }
        }
    ],
    likes: [
        {
            likedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', 
                required: true,
            },
            likedAt: {
                type: Date,
                default: Date.now,
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
    deletedAt: {
        type: Date,
        default: null,
    }
});

postSchema.plugin(mongoosePaginate);

const Post = mongoose.model("Post", postSchema);
module.exports = Post;
