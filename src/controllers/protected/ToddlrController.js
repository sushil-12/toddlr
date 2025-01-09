const Toddler = require("../../models/Toddler");
const User = require("../../models/User");
const { CustomError, ErrorHandler, ResponseHandler } = require('../../utils/responseHandler');
const jwt = require('jsonwebtoken');


const addToddlers = async (req, res) => {
  try {
    const { toddlers } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const parentId = decodedToken.userId;
    // Ensure parentId and toddler data are provided
    if (!parentId || !Array.isArray(toddlers) || toddlers.length === 0) {
      throw new CustomError(400, 'Parent ID and toddlers array are required');
    }

    console.log(toddlers)
    // Prepare toddler documents with parentId
    const toddlerDocuments = toddlers.map((toddler) => ( console.log(toddler),{
      parentId,
      childName: toddler.childName== ''  || toddler.childName== null ? 'toddler' : toddler.childName ,
      gender: toddler.gender == '' ? 'prefer_not_to_say' : toddler.gender,
      birthDate: toddler.birthDate,
      profilePhotoPath: toddler.profilePhotoPath || '',
      isExpecting: toddler.isExpecting || false,
    }));

    // Insert multiple toddler documents into the database
    const savedToddlers = await Toddler.insertMany(toddlerDocuments);
    const updateToddlerAddCheck = await User.updateOne(
      { _id: parentId },
      { firstTimeToddlerAddCompleted: true }
    );
    // Return the saved toddlers in response
    ResponseHandler.success(res, savedToddlers, 201);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const listToddlers = async (req, res) => {
  try {
    // Extract and verify token
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const parentId = decodedToken.userId;

    // Find all toddlers associated with the parentId
    const toddlers = await Toddler.find({ parentId });

    // Check if toddlers exist for the parent
    if (toddlers.length === 0) {
      throw new CustomError(404, 'No toddlers found for this parent');
    }

    // Send the list of toddlers in the response
    ResponseHandler.success(res, toddlers, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

module.exports = { addToddlers, listToddlers }
