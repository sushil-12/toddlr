const createBundle = async(req,res)=> {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const createdBy = decodedToken.userId;
    const {products, totalAmount} = req.body
}

module.exports = {
    createBundle
};