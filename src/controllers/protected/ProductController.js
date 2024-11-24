const { default: mongoose } = require("mongoose");
const { CustomError, ResponseHandler, ErrorHandler } = require("../../utils/responseHandler");
const Product = require("../../models/Product");
const jwt = require('jsonwebtoken');
const { getUserRepository } = require("./UserController");
const Offer = require("../../models/Offer");
const Chat = require("../../models/Chat");


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
            age,
            page = 1,
            limit = 10,
        } = req.query;

        // Build filter criteria based on query parameters
        const filter = {};
        if (category) filter.category = category;
        if (gender) filter.gender = gender;
        if (condition) filter.condition = condition;
        if (size) filter.size = size;
        if (age) filter.age = age;
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


const getProductDetails = async (req, res) => {
    try {
        // Extract product ID from request parameters
        const { id } = req.params;

        // Fetch product details by ID
        const product = await Product.findById(id);
        const sellerDetail = product.createdBy ? await getUserRepository(product.createdBy) : null;

        // If product not found, respond with an error
        if (!product) {
            return ResponseHandler.error(res, null, 404, 'Product not found');
        }

        // Respond with the product details
        return ResponseHandler.success(res, { product, sellerDetail }, 200, 'Product retrieved successfully');
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};


const makeAnOffer = async (req, res) => {
    try {
        // Extract payload from request body
        const { offer_price, offer_description } = req.body;
        const { productId } = req.params; // Assuming productId is passed as a URL parameter
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId; // Assuming user ID is available from authentication middleware

        // Validate required fields
        if (!offer_price || !offer_description) {
            throw new CustomError(400, 'Offer price and description are required');
        }

        // Fetch the product to ensure it exists
        const product = await Product.findById(productId).populate('createdBy', '_id username email');
        if (!product) {
            throw new CustomError(400, 'Product not found');
        }

        // Extract seller details
        const seller = product.createdBy;
        if (!seller) {
            throw new CustomError(400, 'Seller details not found for the product');
        }

        // Create the offer
        const offer = await Offer.create({
            product: productId,
            user: userId,
            price: offer_price,
            description: offer_description,
        });

        // Initial offer message
        const initialMessage = {
            sender: userId,
            content: {
                offer_id: offer?._id,
                offer_price,
                product_name: product.title,
                seller_id: product.createdBy,
                product_image: product.images[0], // Assuming `image` is a field in the product schema
                product_actual_price: product.price,
                status: offer?.status,
                offer_description,
            },
            createdAt: new Date(),
        };

        // Check if a chat already exists between the buyer and seller
        let chat = await Chat.findOne({
            participants: { $all: [userId, seller._id] },
        });

        if (chat) {
            // Add the new message to the existing chat
            chat.messages.push(initialMessage);
            await chat.save();
        } else {
            // Create a new chat
            chat = await Chat.create({
                participants: [userId, seller._id], // Buyer and seller
                messages: [initialMessage],
            });
        }

        // Respond with the created offer and chat details
        return ResponseHandler.success(
            res,
            { offer, chat },
            201,
            'Offer created and chat updated/created successfully'
        );
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};

// Helper function to create or update a chat
const createOrUpdateChat = async (userId, sellerId, content, messageKey) => {
    const initialMessage = {
        sender: userId,
        content,
        createdAt: new Date(),
    };

    let chat = await Chat.findOne({
        participants: { $all: [userId, sellerId] },
    });

    if (chat) {
        // Add the new message to the existing chat
        let oldMessage = chat.messages[messageKey];
        oldMessage.content.action_done = true;
        chat.messages[messageKey] = oldMessage;
        chat.messages.push(initialMessage);
        await chat.save();
    } else {
        // Create a new chat
        chat = await Chat.create({
            participants: [userId, sellerId], // Buyer and seller
            messages: [initialMessage],
        });
    }
};

const updateOffer = async (req, res) => {
    try {
        const { offerId } = req.params; // Product and Offer IDs from URL
        const { action, counter_price, counter_description, messageKey } = req.body; // Request body data
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId; // Assuming user ID is available from authentication middleware

        // Validate action
        if (!['accept', 'counter', 'decline'].includes(action)) {
            throw new CustomError(400, 'Invalid action. Must be "accept", "counter", or "decline".');
        }

        // Fetch the offer and populate product details
        const offer = await Offer.findById(offerId).populate('product');
        if (!offer) {
            throw new CustomError(404, 'Offer not found.');
        }

        const sellerId = offer.product.createdBy; // Assuming `owner` is the seller's user ID

        // Update offer based on action
        if (action === 'accept') {
            offer.status = 'accepted';
        } else if (action === 'decline') {
            offer.status = 'declined';
        } else if (action === 'counter') {
            if (!counter_price || counter_price <= 0) {
                throw new CustomError(400, 'Counter price must be a valid positive number.');
            }
            offer.price = counter_price;
            offer.description = counter_description;
            offer.status = 'counter';
        }

        await offer.save(); // Save the updated offer

        // Generate and save chat message
        const messageContent = {
            offer_id: offer?._id,
            offer_price: offer.price,
            product_name: offer.product.title,
            seller_id: offer.product.createdBy,
            product_image: offer.product.images[0], // Assuming `images` is an array in the product schema
            product_actual_price: offer.product.price,
            status: offer.status,
            offer_description: offer.description,
        };

        await createOrUpdateChat(userId, sellerId, messageContent, messageKey);

        // Return success response
        return ResponseHandler.success(res, offer, 200, `Offer ${action}ed successfully.`);
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};

module.exports = {
    createAndUpdateProduct, getProducts, getProductDetails, makeAnOffer, updateOffer
};
