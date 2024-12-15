const Bundle = require("../../models/Bundle");
const { ErrorHandler, ResponseHandler } = require("../../utils/responseHandler");
const jwt = require('jsonwebtoken');

const createBundle = async (req, res) => {

    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decodedToken.userId;
        const { products, totalAmount } = req.body

        const bundle = new Bundle({
            createdBy,
            products,
            totalAmount
        })
        const savedBundle = await bundle.save()
        // Respond with the newly created Bundle data
        return ResponseHandler.success(res, savedBundle, 201, 'Bundle created successfully');
    }
    catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }

}
const listBundles = async (req, res) => {
    try {
        // Extract the userId from the request token (assuming authentication middleware)
        const token = req.headers.authorization?.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        // Query for bundles created by the user and where status is not "executed"
        const bundle = await Bundle.find({
            createdBy: userId,
            status: { $ne: 'executed' }
        }).populate('products.productId');

        // Respond with the filtered bundles
        return ResponseHandler.success(res, bundle, 200, 'Bundle retrieved successfully');
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};

const getBundleById = async (req, res) => {
    try {
        const { id } = req.params;
        const bundle = await Bundle.findOne({
            _id: id,                // Match by the provided ID
            status: { $ne: 'executed' } // Exclude executed bundles
        }).populate('products.productId'); // Populate product details
        if (!bundle) { return ResponseHandler.error(res, null, 404, "Bundle not found"); }

        return ResponseHandler.success(res, bundle, 200, "Bundle details retrieved successfully");
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};

module.exports = {
    createBundle, listBundles, getBundleById
};