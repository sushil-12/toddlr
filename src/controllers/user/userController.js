const jwt = require('jsonwebtoken');
const CustomError = require("../../utils/responseHandler");
const { config } = require('dotenv');
const { HTTP_STATUS_CODES } = require('../../constants/error_message_codes');
const User = require('../../models/User');


const getUserDetails = async(req,res)=>{

    try{
        var  token = req.headers['access_token']
        if (!token) {
            ResponseHandler.error(res, HTTP_STATUS_CODES.FORBIDDEN, HTTP_STATUS_CODES.FORBIDDEN);
            return;
        }
        jwt.verify(token, config.JWT_SECRET, function(err,decoded){
            if(err) return CustomError.ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { message: "Failed to authenticate token" },HTTP_STATUS_CODES.UNAUTHORIZED)

            var userId = decoded.userId
            User.findById(userId,{password:0},(err,user)=>{
                if(err) return console.log(err)
                CustomError.ResponseHandler.success(user, {user}, HTTP_STATUS_CODES.OK)     
                })    
            })

        }catch(error){
            CustomError.ResponseHandler.error(error)

    }


}



module.exports = {
getUserDetails

}