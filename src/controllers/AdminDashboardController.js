const Offer = require('../models/Offer');
const User = require('../models/User');
const Product = require('../models/Product');
const Payment = require('../models/Payment');


// Controller function to render the admin dashboard
const renderDashboard = async (req, res) => {
    try {
        const offers = await Offer.find();
        const orders = await Payment.find();
        const users = await User.find();
        const products = await Product.find();

        res.render('adminDashboard', {
            orders,
            offers,
            users,
            products
        });
    } catch (error) {
        res.status(500).send('Server Error');
    }
};
module.exports = { renderDashboard };