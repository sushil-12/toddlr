const { ResponseHandler, ErrorHandler, CustomError } = require("../../utils/responseHandler");
const jwt = require('jsonwebtoken');


const Payment = require("../../models/Payment");
const { createMollieClient } = require('@mollie/api-client');


const mollieClient = createMollieClient({ apiKey: `${process.env.MOLLIE_API_KEY}` });


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
    getPaymentStatus
};
