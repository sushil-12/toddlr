const Offer = require('../models/Offer');
const User = require('../models/User');
const Product = require('../models/Product');
const Payment = require('../models/Payment');
const Order = require('../models/Order');



// Controller function to render the admin dashboard
const renderDashboard = async (req, res) => {
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

        res.render('adminDashboard', {
            orders,
            offers,
            payments,
            users,
            products,
        });
    } catch (error) {
        console.error(error); // Log the error
        res.status(500).json({
            status: 'error',
            code: 500,
            message: error.message,
            data: error,
        });
    }
};

module.exports = { renderDashboard };
