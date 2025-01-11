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
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

forumTopicSchema.plugin(mongoosePaginate);

const Topic = mongoose.model("Topic", forumTopicSchema);
module.exports = Topic;
