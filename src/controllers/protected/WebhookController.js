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

    //  const paymentData = await Payment.findOne({ transactionId: paymentId });

        const updatedOrder = await Order.findOneAndUpdate(
            {paymentId: paymentId},
            {$set:{ paymentStatus: payment.status}},
            {new: true}
        )

        if(updatedOrder){
            return ResponseHandler.success(res, updatedOrder, 200);
        }
        
    } catch (error) {
        console.log(error);
        return ResponseHandler.error(res, 500, "Error in updating payment record or creating order");
    }
};

module.exports = { handleWebhook };
