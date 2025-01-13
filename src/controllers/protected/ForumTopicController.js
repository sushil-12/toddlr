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
    const topics = await Topic.find().where({deletedAt:null});

    // Respond with the filtered bundles
    return ResponseHandler.success(
      res,
      topics,
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

module.exports = {
  createTopic,
  getTopicsList,
  getTopicDetails,
  deleteTopic,
  updateTopic
};
