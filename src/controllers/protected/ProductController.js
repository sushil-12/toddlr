const { default: mongoose } = require("mongoose");
const {
  CustomError,
  ResponseHandler,
  ErrorHandler,
} = require("../../utils/responseHandler");
const Product = require("../../models/Product");
const jwt = require("jsonwebtoken");
const { getUserRepository } = require("./UserController");
const Offer = require("../../models/Offer");
const Chat = require("../../models/Chat");
const Bundle = require("../../models/Bundle");
const User = require("../../models/User");

const createAndUpdateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const token = req.headers.authorization.split(" ")[1];
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
      ecoFriendly,
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
          ecoFriendly,
        },
        { new: true, runValidators: true }, // Options to return updated doc and validate
      );

      if (!product) {
        throw new CustomError(404, "Product not found");
      }

      // Respond with updated product data
      return ResponseHandler.success(
        res,
        product,
        200,
        "Product updated successfully",
      );
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
        ecoFriendly,
      });

      const savedProduct = await product.save();
      // Respond with the newly created product data
      return ResponseHandler.success(
        res,
        savedProduct,
        201,
        "Product created successfully",
      );
    }
  } catch (error) {
    console.error(error);
    ErrorHandler.handleError(error, res);
  }
};

const addProductToWishlist = async (req, res) => {
  try {
    // Extract product ID from request parameters
    const productId = req.params.id;

    // Extract token and decode it
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    // Get the user ID from the decoded token
    const userId = decodedToken.userId;

    // Check if the product exists
    const product = await Product.findById(productId);
    if (!product) {
      throw new CustomError(404, "Product not found");
    }

    // Find the user by their ID
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError(404, "User not found");
    }

    // Check if the product is already in the user's wishlist
    if (user.wishlist.includes(productId)) {
      // Remove the productId from the wishlist array
      user.wishlist = user.wishlist.filter(id => id.toString() !== productId.toString());

      // Save the updated user
      await user.save();

      return ResponseHandler.success(
        res,
        null,
        200,
        "Product removed from wishlist"
      );
    }

    // Add the product to the user's wishlist
    user.wishlist.push(productId);
    await user.save();

    // Respond with the updated wishlist
    return ResponseHandler.success(
      res,
      user.wishlist,
      200,
      "Product added to wishlist successfully",
    );
  } catch (error) {
    console.error(error);
    ErrorHandler.handleError(error, res);
  }
};

const getProducts = async (req, res) => {
  try {
    // Extract token and decode it
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Extract query parameters
    const {
      category,
      gender,
      condition,
      minPrice,
      maxPrice,
      brand,
      size,
      occasion,
      age,
      createdBy,
      wishlisted,
      page = 1,
      limit = 10,
    } = req.query;

    // Build filter criteria
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const filter = {
      $and: [
        {
          $or: [
            { reservedAt: { $exists: false } },
            { reservedAt: null },
            { reservedAt: { $lte: twoDaysAgo } },
            { createdBy: createdBy },
          ],
        },
      ],
    };

    // Add createdBy to the filter if provided
    if (createdBy) filter.$and.push({ createdBy });

    // Add other query parameters to the filter
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (occasion) filter.occasion = occasion;
    if (gender) filter.gender = gender;
    if (condition) filter.condition = condition;
    if (size) filter.size = size;
    if (age) filter.age = age;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    filter.deletedAt = null;

    // Pagination and sorting options
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { createdAt: -1 },
    };

    // Fetch products with pagination
    const products = await Product.paginate(filter, options);

    // Fetch wishlisted product IDs directly from the User model
    const user = await User.findOne({ _id: userId }).select("wishlist").lean();
    const wishlistedProductIds = user?.wishlist || [];

    // Get trending products (products with most views in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendingProducts = await Product.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: "$_id",
          viewCount: { $sum: "$views" }
        }
      },
      {
        $sort: { viewCount: -1 }
      },
      {
        $limit: 10
      }
    ]);
    const trendingProductIds = trendingProducts.map(p => p._id.toString());
    const tags = [];
    // Mark products with tags
    products.docs = products.docs.map((product) => {
      const productIdString = product._id.toString();
      
      // Check if product is wishlisted
      product.wishlisted = wishlistedProductIds.some(
        (wishlistId) => wishlistId.toString() === productIdString
      );

      // Create tags array
     
      
      // Check if product is trending
      if (trendingProductIds.includes(productIdString)) {
        tags.push('trending');
      }
      
      // Check if product is new (created within 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (new Date(product.createdAt) > oneDayAgo) {
        tags.push('new');
      }
      
      // Check if product is exclusive for the user
      if (product.createdBy.toString() === userId) {
        tags.push('exclusive_for_you');
      }
      
      // Check if product is eco-friendly
      if (product.ecoFriendly) {
        tags.push('eco_friendly');
      }

      // Add tags to product
      product.tags = tags;

      // Handle reservedAt field logic
      if (
        product.reservedAt &&
        new Date() - new Date(product.reservedAt) > 2 * 24 * 60 * 60 * 1000
      ) {
        product.reservedAt = null;
      }

      return product;
    });

    if (wishlisted === 'true') {
      products.docs = products.docs.filter(product => product.wishlisted === true);
    }

    

    // Respond with the products data
    return ResponseHandler.success(
      res,
      products,
      200,
      "Products retrieved successfully",
    );
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
    const sellerDetail = product.createdBy
      ? await getUserRepository(product.createdBy.toString())
      : null;
    console.log(sellerDetail, product.createdBy.toString(), "SELLAR DATA");

    // If product not found, respond with an error
    if (!product) {
      return ResponseHandler.error(res, null, 404, "Product not found");
    }

    if (
      product.reservedAt &&
      new Date() - new Date(product.reservedAt) > 2 * 24 * 60 * 60 * 1000
    ) {
      product.reservedAt = null;
    }
    await product.save();

    // Respond with the product details
    return ResponseHandler.success(
      res,
      { product, sellerDetail },
      200,
      "Product retrieved successfully",
    );
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
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId; // Assuming user ID is available from authentication middleware

    console.log("offer_Description", offer_description)
    // Validate required fields
    if (!offer_price) {
      throw new CustomError(400, "Offer price required");
    }

    // Fetch the product to ensure it exists
    const product = await Product.findById(productId).populate(
      "createdBy",
      "_id username email",
    );
    if (!product) {
      throw new CustomError(400, "Product not found");
    }

    // Extract seller details
    const seller = product.createdBy;
    if (!seller) {
      throw new CustomError(400, "Seller details not found for the product");
    }

    // Create the offer
    const offer = await Offer.create({
      product: productId,
      user: userId,
      price: offer_price,
      description: offer_description !='' ? offer_description : `Hi ${seller.username}! I'd like to make an offer on this item:`,
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
        offer_description: offer_description !='' ? offer_description : `Hi ${seller.username}! I'd like to make an offer on this item:`,
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
      chat.updatedAt = new Date();
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
      "Offer created and chat updated/created successfully",
    );
  } catch (error) {
    console.error(error);
    ErrorHandler.handleError(error, res);
  }
};

const makeAnOfferForBundle = async (req, res) => {
  try {
    // Extract payload from request body
    const { offer_price, offer_description } = req.body;
    const { bundleId } = req.params; // Assuming productId is passed as a URL parameter
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId; // Assuming user ID is available from authentication middleware

    // Validate required fields
    if (!offer_price) {
      throw new CustomError(400, "Offer price and description are required");
    }

    // Fetch the product to ensure it exists
    const product = await Bundle.findById(bundleId).populate(
      "createdBy",
      "_id username email profile_pic",
    );
    if (!product) {
      throw new CustomError(400, "Bundle not found");
    }
    // Extract seller details
    const seller = product.createdBy;
    const sellerDetails = {
      sellerId: product.createdBy?._id,
      sellerName: product.createdBy?.username,
      email: product.createdBy?.username,
      profilePicture: product.createdBy?.profile_pic
        ? product.createdBy?.profile_pic
        : "",
    };
    if (!seller) {
      throw new CustomError(400, "Seller details not found for the product");
    }
    // Extract product Ids from the bundle
    const productIds = product.products.map((item) => item.productId);

    // Fetch details of all products using the extracted IDs
    const productsList = await Product.find({ _id: { $in: productIds } });
    // Create the offer
    const offer = await Offer.create({
      bundle: bundleId,
      user: userId,
      price: offer_price,
      description: offer_description  !='' ? offer_description : `Hi ${seller.username}! I'd like to make an offer on this item:`,
    });

    // Initial offer message
    const initialMessage = {
      sender: userId,
      content: {
        isBundle: true,
        offer_id: offer?._id,
        offer_price,
        product_name: "",
        seller_id: productsList[0].createdBy, // Assuming seller is same for all products in the bundle
        // product_image: product.images[0], // Assuming `image` is a field in the product schema
        bundle_actual_price: product.totalAmount,
        status: offer?.status,
        offer_description:  offer_description  !='' ? offer_description : `Hi ${seller.username}! I'd like to make an offer on this item:`,
        productsList: productsList,
      },
      createdAt: new Date(),
    };

    // Check if a chat already exists between the buyer and seller
    let chat = await Chat.findOne({
      participants: { $all: [userId, productsList[0].createdBy] },
    });

    if (chat) {
      // Add the new message to the existing chat
      chat.messages.push(initialMessage);
      chat.updatedAt = new Date();
      await chat.save();
    } else {
      // Create a new chat
      chat = await Chat.create({
        participants: [userId, productsList[0].createdBy], // Buyer and seller
        messages: [initialMessage],
      });
    }

    // Respond with the created offer and chat details
    return ResponseHandler.success(
      res,
      { offer, chat, sellerDetails },
      201,
      "Offer created and chat updated/created successfully",
    );
  } catch (error) {
    console.error(error);
    ErrorHandler.handleError(error, res);
  }
};

const updateOffer = async (req, res) => {
  try {
    const { offerId } = req.params; // Product and Offer IDs from URL
    const {
      action,
      counter_price,
      counter_description,
      messageKey,
      otherParticipantId,
    } = req.body; // Request body data
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId; // Assuming user ID is available from authentication middleware

    // Validate action
    if (!["accept", "counter", "decline"].includes(action)) {
      throw new CustomError(
        400,
        'Invalid action. Must be "accept", "counter", or "decline".',
      );
    }

    // Fetch the offer and populate product details
    const offer = await Offer.findById(offerId).populate("product");
    if (!offer) {
      throw new CustomError(404, "Offer not found.");
    }
    const participantId = otherParticipantId; //

    // Update offer based on action
    if (action === "accept") {
      offer.status = "accepted";
    } else if (action === "decline") {
      offer.status = "declined";
    } else if (action === "counter") {
      if (!counter_price || counter_price <= 0) {
        throw new CustomError(
          400,
          "Counter price must be a valid positive number.",
        );
      }
      offer.price = counter_price;
      offer.description = counter_description;
      offer.status = "counter";
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

    await createOrUpdateChat(userId, participantId, messageContent, messageKey);

    // Return success response
    return ResponseHandler.success(
      res,
      offer,
      200,
      `Offer ${action}ed successfully.`,
    );
  } catch (error) {
    console.error(error);
    ErrorHandler.handleError(error, res);
  }
};

const updateOfferForBundle = async (req, res) => {
  try {
    const { offerId } = req.params; // Product and Offer IDs from URL
    const {
      action,
      counter_price,
      counter_description,
      messageKey,
      otherParticipantId,
    } = req.body; // Request body data
    const token = req.headers.authorization.split(" ")[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId; // Assuming user ID is available from authentication middleware

    // Validate action
    if (!["accept", "counter", "decline"].includes(action)) {
      throw new CustomError(
        400,
        'Invalid action. Must be "accept", "counter", or "decline".',
      );
    }

    // Fetch the offer and populate product details
    const offer = await Offer.findById(offerId).populate("bundle");
    if (!offer) {
      throw new CustomError(404, "Offer not found.");
    }

    // Update offer based on action
    if (action === "accept") {
      offer.status = "accepted";
    } else if (action === "decline") {
      offer.status = "declined";
    } else if (action === "counter") {
      if (!counter_price || counter_price <= 0) {
        throw new CustomError(
          400,
          "Counter price must be a valid positive number.",
        );
      }
      offer.price = counter_price;
      offer.description = counter_description;
      offer.status = "counter";
    }

    await offer.save(); // Save the updated offer
    // Extract product Ids from the bundle
    const productIds = offer.bundle.products.map((item) => item.productId);

    // Fetch details of all products using the extracted IDs
    const productsList = await Product.find({ _id: { $in: productIds } });
    const participantId = otherParticipantId;
    const sellerId = productsList[0].createdBy; // Assuming all products inside bundle are from same seller

    // Generate and save chat message
    const messageContent = {
      isBundle: true,
      offer_id: offer?._id,
      offer_price: offer.price,
      seller_id: sellerId,
      bundle_actual_price: offer.bundle.totalAmount,
      status: offer.status,
      offer_description: offer.description,
      productsList: productsList,
    };

    await createOrUpdateChat(userId, participantId, messageContent, messageKey);

    // Return success response
    return ResponseHandler.success(
      res,
      offer,
      200,
      `Offer ${action}ed successfully.`,
    );
  } catch (error) {
    console.error(error);
    ErrorHandler.handleError(error, res);
  }
};

// Helper function to create or update a chat
const createOrUpdateChat = async (
  userId,
  participantId,
  content,
  messageKey,
) => {
  const initialMessage = {
    sender: userId,
    content,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  let chat = await Chat.findOne({
    participants: { $all: [userId, participantId] },
  });

  if (chat) {
    // Add the new message to the existing chat
    const index = chat.messages.findIndex(
      (message) => message._id.toString() === messageKey.toString(),
    ); // Find index of the message
    console.log(index);
    if (index !== -1) {
      // Message exists, update its content
      chat.messages[index].content.action_done = true;
      chat.markModified("messages");
      await chat.save();
    } else {
      console.error("Message not found in chat.messages");
    }

    console.log(chat.messages[index]);
    chat.messages.push(initialMessage);
    chat.updatedAt = new Date();
    await chat.save();
  } else {
    // Create a new chat
    chat = await Chat.create({
      participants: [userId, participantId], // Buyer and seller
      messages: [initialMessage],
    });
  }
};

// This method is used for reserve an item functionality
const updateProductStatus = async (req, res) => {
  const productId = req.query.id;
  const { status } = req.body;

  if (!status) {
    return ResponseHandler.error(res, 500, "Status is required");
  }

  try {
    if (status === "reserved") {
      console.log("PRODUCT ID====>", productId);
      const product = await Product.findByIdAndUpdate(
        productId,
        { reservedAt: new Date() },
        { new: true },
      );
      if (!product) {
        return ResponseHandler.error(res, 404, "Product Not Found.");
      }

      return ResponseHandler.success(
        res,
        product,
        200,
        "Product reserved successfully for two days.",
      );
    }
  } catch (error) {
    return ResponseHandler.error(res, 500, "Internal server error");
  }
};

const deleteProduct = async (req, res) => {
  const productId = req.params.id;

  try {
    // Soft delete by updating isDeleted flag instead of removing the document
    const product = await Product.findByIdAndUpdate(
      productId,
      { deletedAt: Date.now() },
      { new: true }
    );

    if (!product) {
      return ResponseHandler.error(res, 404, "Product Not Found.");
    }

    return ResponseHandler.success(
      res,
      { message: "Product deleted successfully." },
      200);
  } catch (error) {
    return ResponseHandler.error(res, 500, "Internal server error");
  }
};

module.exports = {
  createAndUpdateProduct,
  addProductToWishlist,
  getProducts,
  deleteProduct,
  getProductDetails,
  makeAnOffer,
  updateOffer,
  makeAnOfferForBundle,
  updateOfferForBundle,
  updateProductStatus,
};
