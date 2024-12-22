const { createMollieClient } = require('@mollie/api-client');
const Payment = require('../../models/Payment');
const { ResponseHandler } = require('../../utils/responseHandler');


const mollieClient = createMollieClient({ apiKey: `${process.env.MOLLIE_API_KEY}` });

const handleWebhook = async(req,res) => {

    const paymentId = req.body.id
    try{
        const payment = await mollieClient.payments.get(paymentId);
        await Payment.findOneAndUpdate(
            {transactionId: paymentId},
            {paymentStatus: payment.status}
        )
        return ResponseHandler.success(res,null,200)

    }catch(error){
        return ResponseHandler.error(res,500, "Error in updating payment record")
    }

}

module.exports = { handleWebhook };
