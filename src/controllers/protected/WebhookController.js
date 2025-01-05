const { createMollieClient } = require('@mollie/api-client');
const Payment = require('../../models/Payment');
const { ResponseHandler } = require('../../utils/responseHandler');
const Order = require('../../models/Order.js');

const mollieClient = createMollieClient({ apiKey: `${process.env.MOLLIE_API_KEY}` });

const handleWebhook = async (req, res) => {
    const paymentId = req.body.id;
    
    try {
        // const payment = await mollieClient.payments.get(paymentId);
        
        await Payment.findOneAndUpdate(
            { transactionId: paymentId },
            // { paymentStatus: payment.status },
            { paymentStatus: 'paid' },
            { new: true }
        );

        const paymentData = await Payment.findOne({ transactionId: paymentId });

        const orderData = {
            paymentId: paymentId,
            paymentStatus: paymentData.paymentStatus,
            totalAmount: paymentData.totalAmount || 0,
            productId: paymentData.productId || null,
            bundleId: paymentData.bundleId || null,
            offerId: paymentData.offerId || null,
            createdBy: paymentData.createdBy || null,
            createdAt: new Date()
        };

        const newOrder = new Order(orderData);
        if (paymentData.paymentStatus === 'paid') {
            await newOrder.save();
        }

        return ResponseHandler.success(res, newOrder, 200);
    } catch (error) {
        console.log(error);
        return ResponseHandler.error(res, 500, "Error in updating payment record or creating order");
    }
};

module.exports = { handleWebhook };
