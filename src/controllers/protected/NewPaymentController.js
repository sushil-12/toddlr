const { ResponseHandler, ErrorHandler, CustomError } = require("../../utils/responseHandler");
const jwt = require('jsonwebtoken');


const Payment = require("../../models/Payment");
const { createMollieClient } = require('@mollie/api-client');
const User = require("../../models/User");
const Order = require("../../models/Order");


const mollieClient = createMollieClient({ apiKey: `${process.env.MOLLIE_API_KEY}` });

const addFunds = async (req, res) => {
    try {
        const { userId, amount } = req.query;

        if (!amount) {
            return ResponseHandler.error(res, 400, "Amount is required");
        }


        // Assuming you have a User model to update the user's balance
        const user = await User.findById(userId);

        if (!user) {
            return ResponseHandler.error(res, 404, "User not found");
        }

        user.walletBalance += parseFloat(amount);
        await user.save();

        return ResponseHandler.success(res, { walletBalance: user.walletBalance }, 200, "Funds added successfully");
    } catch (error) {
        console.log(error);
        return ResponseHandler.error(res, 500, "Unable to add funds");
    }
};

const addCard = async (req, res) => {
    try {
        // Extract token and decode user ID
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        const { cardHolder, cardNumber, expiryDate, cvv } = req.body;

        if (!cardHolder || !cardNumber || !expiryDate || !cvv) {
            return ResponseHandler.error(res, 400, "All card details are required");
        }

        // Find user in the database
        const user = await User.findById(userId);
        if (!user) {
            return ResponseHandler.error(res, 404, "User not found");
        }

        // Step 1: Create a payment method in Mollie (for saving card)
        const paymentMethod = await mollieClient.customers.create({
            name: cardHolder,
            email: user.email,
        });

        // Step 2: Add the card details to Mollie
        const payment = await mollieClient.payments.create({
            amount: { value: "0.10", currency: "EUR" }, // Small amount for verification
            method: "creditcard",
            customerId: paymentMethod.id,
            description: "Card registration",
            redirectUrl: "https://your-app.com/card-confirmation",
        });

        if (!payment.id) {
            return ResponseHandler.error(res, 500, "Failed to add card to Mollie");
        }

        // Step 3: Store only the Mollie card ID in the user's profile
        user.cards.push({ mollieCardId: payment.id });
        await user.save();

        return ResponseHandler.success(res, { cardId: payment.id }, 200, "Card added successfully");

    } catch (error) {
        console.error(error);
        return ResponseHandler.error(res, 500, "Unable to add card");
    }
};


const createMolliePayment = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decodedToken.userId;
        const { amount, offerId, productId, bundleId, description } = req.body;

        if (!amount) {
            return ResponseHandler.error(res, 400, "Amount is required");
        }
        try {
            const payment = await mollieClient.payments.create({
                amount: {
                    value: amount,
                    currency: 'USD'
                },
                description: description || 'My first API payment',
                redirectUrl: 'https://toddlr.page.link/Ymry?screen=payment-success',
                webhookUrl: 'https://toddlr.onrender.com/api/common/payment-webhook'
            });
            const paymentDetails = new Payment({
                createdBy,
                productId,
                offerId,
                bundleId,
                totalAmount: amount,
                transactionId: payment.id,
                paymentStatus: payment.status,
                date: new Date()
            });
            const savedPayment = await paymentDetails.save()
            // Forward the customer to payment.getCheckoutUrl().
            const paymentCheckoutUrl = payment.getCheckoutUrl()
            const transactionId = savedPayment.transactionId

            if (paymentCheckoutUrl) {
                const paymentDetails = {
                    paymentCheckoutUrl,
                    transactionId
                }
                return ResponseHandler.success(res, paymentDetails, 200, "Payment Initiated!");
            }
        } catch (error) {
            console.log(error)
            return ResponseHandler.error(res, 500, "Payment Error !!!");
        }

    } catch (error) {
        return ResponseHandler.error(res, 500, "Payment Unsuccessful !!!");
    }

}

const createMolliePaymentV2 = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decodedToken.userId;
        const { amount } = req.body;

        if (!amount) {
            return ResponseHandler.error(res, 400, "Amount is required");
        }
        try {
            const payment = await mollieClient.payments.create({
                amount: {
                    value: amount,
                    currency: 'USD'
                },
                description: 'Add funds to wallet for user id - ' + createdBy,
                redirectUrl: 'https://toddlr.page.link/Ymry?screen=payment-success',
                webhookUrl: 'https://toddlr.onrender.com/api/common/add-fund-webhook?userId=' + createdBy + '&amount=' + amount
            });
            const paymentDetails = new Payment({
                createdBy,
                totalAmount: amount,
                transactionId: payment.id,
                paymentStatus: payment.status,
                date: new Date()
            });
            const savedPayment = await paymentDetails.save()
            // Forward the customer to payment.getCheckoutUrl().
            const paymentCheckoutUrl = payment.getCheckoutUrl()
            const transactionId = savedPayment.transactionId

            if (paymentCheckoutUrl) {
                const paymentDetails = {
                    paymentCheckoutUrl,
                    transactionId
                }
                return ResponseHandler.success(res, paymentDetails, 200, "Payment Initiated!");
            }
        } catch (error) {
            console.log(error)
            return ResponseHandler.error(res, 500, "Payment Error !!!");
        }

    } catch (error) {
        return ResponseHandler.error(res, 500, "Payment Unsuccessful !!!");
    }

}

const getPaymentStatus = async (req, res) => {
    const { transactionId } = req.query;

    try {
        const payment = await Payment.findOne({ transactionId })
        if (!payment) {
            return ResponseHandler.error(res, 404, "Payment Not Found.")
        }

        return ResponseHandler.success(res, payment, 200, "Payment details fetched successfully");
    } catch (error) {
        return ResponseHandler.error(res, 500, "Unable to fetch details")
    }

}

const getOrdersListByType = async (req, res) => {
    const type = req.params.type
    // Extract the userId from the request token (assuming authentication middleware)
    const token = req.headers.authorization?.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;
    let orders = []
    if (type === "bought") {
        // find orders in which buyerId is userId
        orders = await Order.find({ createdBy: userId }).populate({
            path: "productId",
            populate: {
                path: "createdBy",
                select: "_id username email profile_pic"
            }
        }).populate("createdBy", "_id username email profile_pic")
    } else if (type === "sold") {
        // find  orders in which product's createdBy is same as userId 
        orders = await Order.find().populate({
            path: "productId",
            populate: {
                path: "createdBy",
                select: "_id username email profile_pic"
            }
        }).populate("createdBy", "_id username email profile_pic")

        orders = orders.filter(order => order.productId && order.productId.createdBy._id.toString() === userId);
    } else {
        return ErrorHandler.handleError(error, res, "Invalid order type");

    }

    return ResponseHandler.success(res, orders, 200, "Data fetched successfully")

}


const getOrderDetails = async (req, res) => {
    const orderId = req.params.id
    // Extract the userId from the request token (assuming authentication middleware)
    const token = req.headers.authorization?.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const order = await Order.findById(orderId).populate({
        path: "productId",
        populate: {
            path: "createdBy"
        }
    })

    if (order) {
        return ResponseHandler.success(res, order, 200, "Order details fetched successfully")
    } else {
        return ErrorHandler.handleError(error, res, "Order Not Found");
    }
}

module.exports = {
    createMolliePayment, addCard,
    createMolliePaymentV2,
    addFunds,
    getPaymentStatus,
    getOrdersListByType,
    getOrderDetails
};
