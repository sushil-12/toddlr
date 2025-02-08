const mongoose = require("mongoose");
const mongoosePaginate = require('mongoose-paginate-v2');

const forumTopicSchema = new mongoose.Schema({
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
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
        // enum: ["clothes", "toys", "care", "books", "outdoor"],
        required: true,
    },
    tag: {
        type: String,
        // enum: ["healthcare", "nutrition", "feeding"],
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
    postType: {
        type: String,
        enum: ["sell_an_item","story","post","topic"],
        default: "topic",
        required: true,
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
    likeCount: [
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
    comments: [
        {
            commentedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
            comment: {
                type: String,
                required: true,
                trim: true,
            },
            commentedAt: {
                type: Date,
                default: Date.now,
            },
            likes: [{  // **Likes array for comments**
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            }],
            replies: [
                {
                    repliedBy: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                        required: true,
                    },
                    reply: {
                        type: String,
                        required: true,
                        trim: true,
                    },
                    repliedAt: {
                        type: Date,
                        default: Date.now,
                    },
                    likes: [{  // **Likes array for replies**
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                    }],
                }
            ]
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

forumTopicSchema.plugin(mongoosePaginate);

const Topic = mongoose.model("Topic", forumTopicSchema);
module.exports = Topic;
