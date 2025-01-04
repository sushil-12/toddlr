const { createMollieClient } = require('@mollie/api-client');
const Payment = require('../../models/Payment');
const { ResponseHandler } = require('../../utils/responseHandler');
const Order = require('../../models/Order.js');

const mollieClient = createMollieClient({ apiKey: `${process.env.MOLLIE_API_KEY}` });

const handleWebhook = async (req, res) => {
    const paymentId = req.body.id;
    try {
        const payment = await mollieClient.payments.get(paymentId);
        await Payment.findOneAndUpdate(
            { transactionId: paymentId },
            { paymentStatus: payment.status },
            { new: true }
        );

        const orderData = {
            paymentId: paymentId,
            paymentStatus: payment.status,
            items: items || [],
            totalAmount: payment.totalAmount || 0,
            productId: payment.productId || null,
            bundleId: payment.bundleId || null,
            offerId: payment.offerId || null,
            createdAt: new Date()
        };

        const newOrder = new Order(orderData);
        await newOrder.save();

        return ResponseHandler.success(res, newOrder, 200);
    } catch (error) {
        return ResponseHandler.error(res, 500, "Error in updating payment record or creating order");
    }
};

module.exports = { handleWebhook };
