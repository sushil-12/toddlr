const { default: mongoose } = require("mongoose");
const {
    CustomError,
    ResponseHandler,
    ErrorHandler,
} = require("../../utils/responseHandler");
const Wishlist = require("../../models/wishlist.model");
const jwt = require("jsonwebtoken");
const Product = require("../../models/Product");

const createAndUpdateWishlist = async (req, res) => {
    try {
        const wishlistId = req.params.id;
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const createdBy = decodedToken.userId;

        const { title, description, products } = req.body;

        // Title validation
        if (!title || typeof title !== 'string') {
            throw new CustomError(400, "Title is required and must be a string");
        }
        if (title.length < 3 || title.length > 100) {
            throw new CustomError(400, "Title must be between 3 and 100 characters");
        }

        // Generate slug from title
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        let wishlist;

        if (wishlistId) {
            // Check if the wishlist exists and belongs to the user
            wishlist = await Wishlist.findOne({ _id: wishlistId, createdBy });
            if (!wishlist) {
                throw new CustomError(404, "Wishlist not found or unauthorized access");
            }

            // Ensure title uniqueness for the same user when updating
            const existingWishlist = await Wishlist.findOne({
                createdBy,
                title,
                _id: { $ne: wishlistId },
            });

            if (existingWishlist) {
                throw new CustomError(400, "A wishlist with this title already exists");
            }

            // Update the wishlist
            wishlist.title = title;
            wishlist.slug = slug;
            wishlist.description = description;
            wishlist.products = products;

            const updatedWishlist = await wishlist.save();

            return ResponseHandler.success(
                res,
                updatedWishlist,
                200,
                "Wishlist updated successfully"
            );
        } else {
            // Ensure title uniqueness for new wishlist creation
            const existingWishlist = await Wishlist.findOne({ createdBy, title });
            if (existingWishlist) {
                throw new CustomError(400, "A wishlist with this title already exists");
            }

            // Create new wishlist
            wishlist = new Wishlist({
                title,
                slug,
                description,
                products,
                createdBy,
            });

            const savedWishlist = await wishlist.save();
            return ResponseHandler.success(
                res,
                savedWishlist,
                201,
                "Wishlist created successfully"
            );
        }
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};

const getWishlists = async (req, res) => {
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        const { page = 1, limit = 10 } = req.query;

        const options = {
            page: parseInt(page, 10),
            limit: parseInt(limit, 10),
            sort: { createdAt: -1 },
            populate: "products",
        };

        const wishlists = await Wishlist.paginate({ createdBy: userId }, options);

        return ResponseHandler.success(
            res,
            wishlists,
            200,
            "Wishlists retrieved successfully"
        );
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};

const getWishlistDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { fullDetails } = req.query; // Check if full product details are requested

        let wishlist = await Wishlist.findById(id).populate({
            path: "products",
            select: "_id", // Default: Only return product IDs
        });

        if (!wishlist) {
            throw new CustomError(404, "Wishlist not found");
        }

        let lastProductImage = null;

        if (wishlist.products.length > 0) {
            // Fetch the last added product with only the image field
            const lastProduct = await Product.findById(wishlist.products[wishlist.products.length - 1]._id)
                .select("images"); // Assuming "image" is the field for product images

            if (lastProduct) {
                lastProductImage = lastProduct.images[0];
            }
        }

        // If fullDetails=true, populate all product details
        if (fullDetails === "true") {
            wishlist = await Wishlist.findById(id).populate({
                path: "products",
                populate: {
                    path: "createdBy",
                    select: "username profile_pic",
                },
            });
        }

        // Convert wishlist to an object and add `thumbnail` key
        const wishlistData = wishlist.toObject();
        wishlistData.thumbnail = lastProductImage; // Attach the last product image
        wishlistData.productCount = wishlist.products.length;

        return ResponseHandler.success(
            res,
            wishlistData,
            200,
            "Wishlist retrieved successfully"
        );
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};

const deleteWishlist = async (req, res) => {
    try {
        const { id } = req.params;
        const token = req.headers.authorization.split(" ")[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decodedToken.userId;

        // Find the wishlist to ensure it exists and belongs to the user
        const wishlist = await Wishlist.findOne({ _id: id, createdBy: userId });

        if (!wishlist) {
            throw new CustomError(404, "Wishlist not found or unauthorized access");
        }

        // Delete the wishlist
        await Wishlist.findByIdAndDelete(id);

        return ResponseHandler.success(
            res,
            null,
            200,
            "Wishlist deleted successfully"
        );
    } catch (error) {
        console.error(error);
        ErrorHandler.handleError(error, res);
    }
};

module.exports = {
    createAndUpdateWishlist,
    getWishlists,
    getWishlistDetails,
    deleteWishlist
};