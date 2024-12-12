const {ResponseHandler, ErrorHandler, CustomError } = require("../../utils/responseHandler");
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
    try{

        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decodedToken.userId;
        const {amount, paymentMethodNonce,offerId, productId } = req.body
    
        if(!amount || !paymentMethodNonce ){
            // throw new CustomError(400, 'Payment Method Nonce and amount is required!');
           return ResponseHandler.error(res, 400,"Amount and Nonce token are required")
        }
        if(!offerId || !productId){
            return ResponseHandler.error(res, 400,"Offer Id or Product Id is required.")
        }
        const updatedOffer = {}
        const mappedProduct = {}
        if(offerId){
             updatedOffer = await Offer.findById(offerId)
    
        }else{
            mappedProduct = await Product.findById(productId)
        }
    
        // use nonce received from client, currently using statis nonce
        gateway.transaction.sale({
            amount: amount,
            paymentMethodNonce:"fake-valid-nonce", // use payment method nonce
            options: {
                submitForSettlement: true
            }	
        }, async (err,result)=> {
            if(err){
                ErrorHandler.handleError(err)
            }
            if(result && result.success){
                console.log("Result Received===>",result);
                const paymentDetails = new Payment(
                    createdBy,
                    mappedProduct,
                    updatedOffer,
                    amount,
                    result?.transaction?.id,
                    result?.status,
                    new Date()
                )
                const savedPayment = await paymentDetails.save()
                return ResponseHandler.success(res,savedPayment,200, "Payment Successful!"  )
            }else{
                return ResponseHandler.error(res, 500, "Payment Unsuccessful !!!")
            }
            
        })

   
   
    }catch(error){
        return ResponseHandler.error(res,error, 500, "Payment Unsuccessful !!!")

    }


}

module.exports = {
    getBraintreeClientToken,
    createTransactionBraintree
};
