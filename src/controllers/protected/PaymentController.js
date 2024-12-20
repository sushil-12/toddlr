const { ResponseHandler, ErrorHandler, CustomError } = require("../../utils/responseHandler");
const jwt = require('jsonwebtoken');
const braintree = require("braintree");
const Offer = require("../../models/Offer");
const Product = require("../../models/Product");
const Payment = require("../../models/Payment");

const gateway = new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY
});
// Client token used on client side to communicate with braintree
const getBraintreeClientToken = async (req, res) => {

    try {
        // const token = req.headers.authorization.split(' ')[1];
        gateway.clientToken
            .generate({
                merchantAccountId:"k9jth2hkd4tdwp88"
            })
            .then(response => {
                return ResponseHandler.success(res, { client_token: response.clientToken }, 200, "Token Generated Successfully")
            })
    }
    catch (error) {
        console.log("Error", error)
        ErrorHandler.handleError(error, res)
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
    getBraintreeClientToken,
    createTransactionBraintree
};
