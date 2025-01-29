const Topic = require("../../models/ForumTopic");
const {
  ErrorHandler,
  ResponseHandler,
  CustomError,
} = require("../../utils/responseHandler");
const jwt = require("jsonwebtoken");

const createTopic = async (req, res) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const createdBy = decodedToken.userId;
    const { title, message, category, tag, postType } = req.body;

    const topic = new Topic({
      createdBy: createdBy,
      title: title,
      message: message,
      category: category,
      tag: tag,
      createdAt: Date.now(),
      pins: [],
      members: [],
      likeCount: [],
      postType: postType,
    });
    const savedTopic = await topic.save();
    // Respond with the newly created Bundle data
    return ResponseHandler.success(
      res,
      savedTopic,
      201,
      "Topic created successfully",
    );
  } catch (error) {
    console.error(error);
    ErrorHandler.handleError(error, res);
  }
};
const getTopicsList = async (req, res) => {
  try {
    // Extract the userId from the request token (assuming authentication middleware)
    const token = req.headers.authorization?.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Query for fetching all topics
    const topics = await Topic.find({ deletedAt: null });

    // Transform topics to include commentCount and exclude comments
    const transformedTopics = topics.map(topic => {
      let commentCount = 0;
      topic.comments.forEach(comment => {
        commentCount += 1 + (comment.replies ? comment.replies.length : 0);
      });

      // Create a new object excluding the comments array
      const { ...topicData } = topic.toObject();
      return {
        ...topicData,
        commentCount, // Add commentCount to the response
      };
    });

    // Respond with the transformed topics
    return ResponseHandler.success(
      res,
      transformedTopics,
      200,
      "Topics retrieved successfully",
    );
  } catch (error) {
    console.error(error);
    ErrorHandler.handleError(error, res);
  }
};

const getTopicDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await Topic.findOne({
      _id: id, // Match by the provided ID
    });
    if (!topic) {
      return ResponseHandler.error(res, null, 404, "Topic not found");
    }

    return ResponseHandler.success(
      res,
      topic,
      200,
      "Topic details retrieved successfully",
    );
  } catch (error) {
    console.error(error);
    ErrorHandler.handleError(error, res);
  }
};

const deleteTopic = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new CustomError(400, "Invalid ID");
    }
    const topic = await Topic.findById(id);
    if (!topic) {
      throw new CustomError(404, "No record found");
    }
    topic.deletedAt = Date.now();
    await topic.save;

    ResponseHandler.success(
      res,
      { message: "Record deleted successfully" },
      200,
    );
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const updateTopic = async (req, res) => {
  try {
    const topicId = req.params.id;
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const createdBy = decodedToken.userId;
    const { title, tag, category, message } = req.body;

    
    const updatedTopic = await Topic.findOneAndUpdate(
      { _id: topicId, createdBy }, 
      { $set: { title, tag, category, message } },
      { new: true, runValidators: true }, 
    );
    if(!updatedTopic){
        throw new CustomError(404, 'Topic not found');
    }

    return ResponseHandler.success(res, updatedTopic,200,"Topic updated successfully")

  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const actionOnTopic = async (req, res) => {
  try {
    const action = req.params.action;
    const topicId = req.body.topicId;
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    if (!action) {
      throw new CustomError(400, "Action is required");
    }

    let update = {};

    // Fetch the topic first to check if the user has already performed the action
    const topic = await Topic.findById(topicId);
    if (!topic) {
      throw new CustomError(404, "Topic not found");
    }

    if (action === "join") {
      const isMember = topic.members.some((member) => member.joinedBy.toString() === userId);
      update = isMember
        ? { $pull: { members: { joinedBy: userId } } } // Remove user if already joined
        : { $addToSet: { members: { joinedBy: userId, joinedAt: new Date() } } }; // Add user if not joined
    } else if (action === "pin") {
      const isPinned = topic.pins.some((pin) => pin.pinnedBy.toString() === userId);
      update = isPinned
        ? { $pull: { pins: { pinnedBy: userId } } } // Remove pin if already pinned
        : { $addToSet: { pins: { pinnedBy: userId, pinnedAt: new Date() } } }; // Pin if not pinned
    } else if (action === "like") {
      const isLiked = topic.likeCount.some((like) => like.likedBy.toString() === userId);
      update = isLiked
        ? { $pull: { likeCount: { likedBy: userId } } } // Remove like if already liked
        : { $addToSet: { likeCount: { likedBy: userId, likedAt: new Date() } } }; // Like if not liked
    } else {
      throw new CustomError(400, "Invalid Action");
    }

    // Update the topic document
    const updatedTopic = await Topic.findByIdAndUpdate(topicId, update, { new: true, runValidators: true });

    if (!updatedTopic) {
      throw new CustomError(404, "Topic not found");
    }

    return ResponseHandler.success(res, updatedTopic, 200, `Action '${action}' toggled successfully`);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const addCommentsOnTopic = async (req, res) => {
  try {
    const { topicId, comment, parentCommentId } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Fetch the topic
    const topic = await Topic.findById(topicId);
    if (!topic) {
      throw new CustomError(404, "Topic not found");
    }

    // If `parentCommentId` is provided, handle adding a reply
    if (parentCommentId) {
      const parentComment = topic.comments.id(parentCommentId); // Locate the parent comment
      if (!parentComment) {
        throw new CustomError(404, "Parent comment not found");
      }

      // Create a new reply object
      const newReply = {
        repliedBy: userId,
        reply: comment, // Use the `comment` field for the reply content
        repliedAt: new Date(),
      };

      // Push the reply into the replies array of the parent comment
      parentComment.replies.push(newReply);
    } else {
      // Handle adding a new comment
      const newComment = {
        commentedBy: userId,
        comment: comment,
        commentedAt: new Date(),
      };

      // Push the comment into the topic's comments array
      topic.comments.push(newComment);
    }

    // Save the updated topic
    await topic.save();

    return ResponseHandler.success(
      res,
      topic,
      200,
      parentCommentId ? "Reply added successfully" : "Comment added successfully"
    );
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const likeComment = async (req, res) => {
  try {
    const { topicId, commentId, replyId } = req.body;
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Fetch the topic
    const topic = await Topic.findById(topicId);
    if (!topic) {
      throw new CustomError(404, "Topic not found");
    }

    let comment;
    
    if (replyId) {
      // Find the parent comment
      const parentComment = topic.comments.id(commentId);
      if (!parentComment) {
        throw new CustomError(404, "Comment not found");
      }
      // Find the reply
      comment = parentComment.replies.id(replyId);
    } else {
      // Handle liking/unliking a main comment
      comment = topic.comments.id(commentId);
    }

    if (!comment) {
      throw new CustomError(404, "Comment/Reply not found");
    }

    // Check if user has already liked
    const alreadyLiked = comment.likes.includes(userId);
    if (alreadyLiked) {
      // Unlike
      comment.likes.pull(userId);
    } else {
      // Like
      comment.likes.push(userId);
    }

    // Save the topic with updated comment/reply
    await topic.save();

    return ResponseHandler.success(
      res,
      topic,
      200,
      alreadyLiked ? "Like removed" : "Like added"
    );
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};


module.exports = {
  createTopic,
  likeComment,
  getTopicsList,
  getTopicDetails,
  deleteTopic,
  addCommentsOnTopic,
  updateTopic,
  actionOnTopic
};
