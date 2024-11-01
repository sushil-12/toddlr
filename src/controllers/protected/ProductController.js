const { default: mongoose } = require("mongoose");
const { CustomError, ResponseHandler, ErrorHandler } = require("../../utils/responseHandler");
const Product = require("../../models/Product");
const jwt = require('jsonwebtoken');


const createAndUpdateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decodedToken.userId;
        // Destructure and assign default values for the request body
        const {
            images,
            title,
            category,
            price,
            size,
            description,
            age,
            gender,
            brand,
            packageSize,
            condition,
            occasion,
            shareWith,
        } = req.body;

        let product;
        if (productId) {
            // Update existing product
            product = await Product.findByIdAndUpdate(
                productId,
                {
                    images,
                    title,
                    category,
                    price,
                    size,
                    description,
                    age,
                    gender,
                    brand,
                    packageSize,
                    condition,
                    occasion,
                    createdBy,
                    shareWith,
                },
                { new: true, runValidators: true } // Options to return updated doc and validate
            );

            if (!product) {
                throw new CustomError(404, 'Product not found');
            }

            // Respond with updated product data
            return ResponseHandler.success(res, product, 200, 'Product updated successfully');
        } else {
            // Create new product
            product = new Product({
                images,
                title,
                category,
                price,
                size,
                description,
                age,
                gender,
                brand,
                packageSize,
                condition,
                occasion,
                createdBy,
                shareWith,
            });

            const savedProduct = await product.save();
            // Respond with the newly created product data
            return ResponseHandler.success(res, savedProduct, 201, 'Product created successfully');
        }
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};

const getProducts = async (req, res) => {
    try {
        // Extract query parameters for filtering, sorting, and pagination (if any)
        const {
            category,
            gender,
            condition,
            minPrice,
            maxPrice,
            size,
            page = 1,
            limit = 10,
        } = req.query;

        // Build filter criteria based on query parameters
        const filter = {};
        if (category) filter.category = category;
        if (gender) filter.gender = gender;
        if (condition) filter.condition = condition;
        if (size) filter.size = size;
        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = Number(minPrice);
            if (maxPrice) filter.price.$lte = Number(maxPrice);
        }

        // Pagination and sorting
        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            sort: { createdAt: -1 }, // Sort by creation date in descending order
        };

        // Fetch products with pagination
        const products = await Product.paginate(filter, options);

        // Respond with the products data
        return ResponseHandler.success(res, products, 200, 'Products retrieved successfully');
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};


module.exports = {
    createAndUpdateProduct, getProducts
};
