const { ResponseHandler, ErrorHandler, CustomError } = require("../../utils/responseHandler");
const jwt = require('jsonwebtoken');


const Payment = require("../../models/Payment");
const { createMollieClient } = require('@mollie/api-client');
const User = require("../../models/User");


const mollieClient = createMollieClient({ apiKey: `${process.env.MOLLIE_API_KEY}` });

const addFunds = async (req, res) => {
    try {
        const { userId, amount } = req.params;

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

        return ResponseHandler.success(res, { balance: user.balance }, 200, "Funds added successfully");
    } catch (error) {
        console.log(error);
        return ResponseHandler.error(res, 500, "Unable to add funds");
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
            const payment =  await mollieClient.payments.create({
                amount: {
                    value: amount,
                    currency: 'USD'
                },
                description: 'Add funds to wallet for user id - ' + createdBy,
                redirectUrl: 'https://toddlr.page.link/Ymry?screen=payment-success',
                webhookUrl: 'https://toddlr.onrender.com/api/common/add-fund-webhook?userId=' + createdBy+'&amount='+amount
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

module.exports = {
    createMolliePayment,
    createMolliePaymentV2,
    addFunds,
    getPaymentStatus
};
