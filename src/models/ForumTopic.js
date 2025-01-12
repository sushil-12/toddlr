const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');

const forumTopicSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',  // assuming there's a Parent model
        required: true,
    },
    title: {
        type: String,
        required: true,
        trim: true,
    },
    message: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        enum: ["clothes", "toys", "care", "books", "outdoor"],
        required: true,
    },
    tag: {
        type: String,
        enum: ["healthcare", "nutrition", "feeding"],
        required: true,
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
    likeCount:[
        {
            likedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', 
                required: true,
            },
            likedAt:{
                type: Date,
                default: Date.now,
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

forumTopicSchema.plugin(mongoosePaginate);

const Topic = mongoose.model("Topic", forumTopicSchema);
module.exports = Topic;
