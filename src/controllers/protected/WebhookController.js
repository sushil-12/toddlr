const { createMollieClient } = require('@mollie/api-client');


const mollieClient = createMollieClient({ apiKey: `${process.env.MOLLIE_API_KEY}` });

const handleWebhook = async(req,res) => {

    try{
        const paymentId = req.body.id
        const payment = await mollieClient.payments.get(paymentId);
        if(payment.status === "paid"){
            console.log("Payment Successful", paymentId)
        }
    }catch(error){

        console.log("Error From Webhook", error)
    }

}

module.exports = { handleWebhook };
