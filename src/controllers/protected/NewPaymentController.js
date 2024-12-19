const { ResponseHandler, ErrorHandler, CustomError } = require("../../utils/responseHandler");
const jwt = require('jsonwebtoken');
const braintree = require("braintree");
const Offer = require("../../models/Offer");
const Product = require("../../models/Product");
const Payment = require("../../models/Payment");
const { createMollieClient } = require('@mollie/api-client');


const mollieClient = createMollieClient({ apiKey: `${process.env.MOLLIE_API_KEY}` });


const createMolliePayment = async (req,res) => {
    try {
        console.log("I AM HERE===>")
        const token = req.headers.authorization.split(' ')[1];
        console.log("I AM HERE===>2")
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decodedToken.userId;
        console.log("I AM HERE===>3")
        const { amount, offerId, productId, bundleId } = req.body;
        
        if (!amount) {
            return ResponseHandler.error(res, 400, "Amount is required");
        }
        console.log("I AM HERE===>4",amount)
        try {
            const payment = await mollieClient.payments.create({
                amount: {
                  value: amount,
                  currency: 'USD'
                },
                description: 'My first API payment',
                redirectUrl: 'https://toddlr.page.link/Ymry/',
                webhookUrl:  'https://webhook.site/03e7bc85-98b5-4e98-a3a9-2f6ba488516a'
              });
    
              console.log("PAYMENT===>", payment,payment.getCheckoutUrl())
              
            // Forward the customer to payment.getCheckoutUrl().
              const paymentCheckoutUrl = payment.getCheckoutUrl()
    
              if(paymentCheckoutUrl){
                return ResponseHandler.success(res, paymentCheckoutUrl, 200, "Payment Initiated!");
              }    
        } catch (error) {
            console.log("ERROR===>",error)
            return ResponseHandler.error(res, 500, "Payment Error !!!");
        }
        
          
        // gateway.transaction.sale({
        //     amount: amount,
        //     paymentMethodNonce: "fake-valid-nonce", // use payment method nonce
        //     options: {
        //         submitForSettlement: true
        //     }
        // }, async (err, result) => {
        //     if (err) {
        //         ErrorHandler.handleError(err);
        //         return ResponseHandler.error(res, 500, "Payment Unsuccessful !!!");
        //     }

        //     if (result && result.success) {
        //         const paymentStatus = result?.success ? 'success' : 'failed';

        //         const paymentDetails = new Payment({
        //             createdBy,
        //             productId,
        //             offerId,
        //             bundleId,
        //             amount,
        //             transactionId: result?.transaction?.id,
        //             paymentStatus: paymentStatus,
        //             date: new Date()
        //         });

        //         try {
        //             const savedPayment = await paymentDetails.save();
        //             return ResponseHandler.success(res, savedPayment, 200, "Payment Successful!");
        //         } catch (error) {
        //             console.log(error)
        //             return ResponseHandler.error(res, 500, "Error saving payment details!");
        //         }
        //     } else {
        //         return ResponseHandler.error(res, 500, "Payment Unsuccessful !!!");
        //     }
        // });
    } catch (error) {
        return ResponseHandler.error(res, 500, "Payment Unsuccessful !!!");
    }

}



/* 
*  Create transaction api on braintree
*/
const createTransactionBraintree = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decodedToken.userId;
        const { amount, paymentMethodNonce, offerId, productId, bundleId } = req.body;
        
        if (!amount || !paymentMethodNonce) {
            return ResponseHandler.error(res, 400, "Amount and Nonce token are required");
        }

        // use nonce received from client, currently using static nonce
        gateway.transaction.sale({
            amount: amount,
            paymentMethodNonce: "fake-valid-nonce", // use payment method nonce
            options: {
                submitForSettlement: true
            }
        }, async (err, result) => {
            if (err) {
                ErrorHandler.handleError(err);
                return ResponseHandler.error(res, 500, "Payment Unsuccessful !!!");
            }

            if (result && result.success) {
                const paymentStatus = result?.success ? 'success' : 'failed';

                const paymentDetails = new Payment({
                    createdBy,
                    productId,
                    offerId,
                    bundleId,
                    amount,
                    transactionId: result?.transaction?.id,
                    paymentStatus: paymentStatus,
                    date: new Date()
                });

                try {
                    const savedPayment = await paymentDetails.save();
                    return ResponseHandler.success(res, savedPayment, 200, "Payment Successful!");
                } catch (error) {
                    console.log(error)
                    return ResponseHandler.error(res, 500, "Error saving payment details!");
                }
            } else {
                return ResponseHandler.error(res, 500, "Payment Unsuccessful !!!");
            }
        });
    } catch (error) {
        return ResponseHandler.error(res, 500, "Payment Unsuccessful !!!");
    }
};

module.exports = {
    createTransactionBraintree,
    createMolliePayment
};
