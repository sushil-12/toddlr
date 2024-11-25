const {ResponseHandler, ErrorHandler } = require("../../utils/responseHandler");
const jwt = require('jsonwebtoken');
const braintree = require("braintree")

const getBraintreeClientToken = async(req,res) => {
    const gateway = new braintree.BraintreeGateway({
        environment: braintree.Environment.Sandbox,
        merchantId: process.env.BRAINTREE_MERCHANT_ID,
        publicKey: process.env.BRAINTREE_PUBLIC_KEY,
        privateKey: process.env.BRAINTREE_PRIVATE_KEY
      });
    console.log("I am here ====>", gateway)
    try {
        // const token = req.headers.authorization.split(' ')[1];
        gateway.clientToken
               .generate({})
               .then( response => {
                return   ResponseHandler.success(res,{client_token: response.clientToken},200, "Token Generated Successfully")
               }) 
    }
    catch(error){
        console.log("Error", error)
        ErrorHandler.handleError(error, res)
    }
 }

module.exports = {
    getBraintreeClientToken
};
