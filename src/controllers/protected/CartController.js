const Bundle = require("../../models/Bundle");
const { ErrorHandler, ResponseHandler } = require("../../utils/responseHandler");
const jwt = require('jsonwebtoken');

const createBundle = async(req,res)=> {

    try{
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decodedToken.userId;
        const {products, totalAmount} = req.body
    
        const bundle = new Bundle({
            createdBy,
            products,
            totalAmount
        })
        const savedBundle = await bundle.save()
         // Respond with the newly created Bundle data
         return ResponseHandler.success(res, savedBundle, 201, 'Bundle created successfully');
    }
    catch(error){
        console.error(error);
        ErrorHandler.handleError(error, res);
    }

}

module.exports = {
    createBundle
};