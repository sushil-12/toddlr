const { createMollieClient } = require('@mollie/api-client');
const Payment = require('../../models/Payment');


const mollieClient = createMollieClient({ apiKey: `${process.env.MOLLIE_API_KEY}` });

const handleWebhook = async(req,res) => {

    try{
        const paymentId = req.body.id
        const payment = await mollieClient.payments.get(paymentId);
        if(payment.status === "paid"){
            console.log("Payment Successful", paymentId)
            const paymentDetails = new Payment({
                    createdBy,
                    productId,
                    offerId,
                    bundleId,
                    amount,
                    transactionId: paymentId,
                    paymentStatus: payment.status,
                    date: new Date()
                });

                try {
                    const savedPayment = await paymentDetails.save();
                    return ResponseHandler.success(res, savedPayment, 200, "Payment Successful!");
                } catch (error) {
                    console.log(error)
                    return ResponseHandler.error(res, 500, "Error saving payment details!");
                }
        }
    }catch(error){

        console.log("Error From Webhook", error)
    }

}

module.exports = { handleWebhook };
