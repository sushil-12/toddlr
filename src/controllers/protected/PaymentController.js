const {ResponseHandler, ErrorHandler } = require("../../utils/responseHandler");
const jwt = require('jsonwebtoken');
const braintree = require("braintree")

const gateway = new braintree.BraintreeGateway({
    environment: braintree.Environment.Sandbox,
    merchantId: process.env.BRAINTREE_MERCHANT_ID,
    publicKey: process.env.BRAINTREE_PUBLIC_KEY,
    privateKey: process.env.BRAINTREE_PRIVATE_KEY
  });
// Client token used on client side to communicate with braintree
const getBraintreeClientToken = async(req,res) => {
   
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


/* 
*  Create transaction api on braintree
*/
const createTransactionBraintree = async(req,res)=>{
    const {amount, paymentMethodNonce} = req.body
    // use nonce received from client, currently using statis nonce
    gateway.transaction.sale({
        amount: amount,
        paymentMethodNonce:"fake-valid-nonce",
        options: {
            submitForSettlement: true
        }	
    }, (err,result)=> {

        console.log("Error Received===>",err);
        
    })
}

module.exports = {
    getBraintreeClientToken,
    createTransactionBraintree
};
