
const Offer = require('../../models/Offer');
const Order = require('../../models/Order');
const Payment = require('../../models/Payment');
const Product = require('../../models/Product');
const User = require('../../models/User');
const { ResponseHandler, ErrorHandler } = require('../../utils/responseHandler');

// Controller function to render the admin dashboard
const dashboard = async (req, res) => {
    try {
        const offers = await Offer.find().lean();
        const payments = await Payment.find().lean();
        const users = await User.find().lean();
        const products = await Product.find().lean();
        const orders = await Order.find()
            .populate('productId')
            .populate('bundleId')
            .populate('offerId')
            .lean();

        if (orders.length > 0) {
            console.log({ bundleId: orders[0].bundleId }); // Debug the data
        } else {
            console.log('No orders found');
        }

        data = {
            orders,
            offers,
            payments,
            users,
            products,
        }

        return ResponseHandler.success(
            res,
            data,
            200,
            "Topics retrieved successfully",
        );
    } catch (error) {
        console.error(error); // Log the error
        ErrorHandler.handleError(error, res);
    }
};

module.exports = { dashboard };
