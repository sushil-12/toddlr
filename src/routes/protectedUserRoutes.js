const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { getProfile, checkPassword, sendOtpVerificationOnEmail, logout, saveSidebarData, getSidebarData, verifyEmail, cancelEmailChangeRequest, createOrEditUser, getUserProfile, getAllUser, deleteUser, editUserProfile, createChatWithCoach, getRecentOrders, updateOrderReview } = require('../controllers/protected/UserController');
const { uploadMediaToLibrary, deleteMedia } = require('../controllers/common/FileUploader');
const { getAllMedia, editMedia, getAllImages } = require('../controllers/common/MediaOperations');
const { createEditPost, getAllPosts, getPostById, deletePost, quickEditPost, getAllPostTypesAndPages, listFiles } = require('../controllers/protected/PostOperations');
const { createEditCategory, getAllCategories, getCategoryById } = require('../controllers/protected/CategoryController');
const { createEditCustomField, getAllCustomField, getCustomFieldById, deleteCustomField } = require('../controllers/protected/CustomFieldTemplateController');
const { createOrEditWebsite, listWebsites, getWebsite, listWebsitesWithMenus, deleteWebsite } = require('../controllers/protected/WebsiteController');
const { addToddlers, listToddlers } = require('../controllers/protected/ToddlrController');
const { createAndUpdateProduct, getProducts, getProductDetails, makeAnOffer, updateOffer, makeAnOfferForBundle, updateOfferForBundle, updateProductStatus, addProductToWishlist } = require('../controllers/protected/ProductController');
const { createBundle, listBundles, getBundleById } = require('../controllers/protected/CartController');
const { createMolliePayment, getPaymentStatus, addFunds, createMolliePaymentV2 } = require('../controllers/protected/NewPaymentController');
const { createTopic, getTopicDetails, getTopicsList, deleteTopic, updateTopic, actionOnTopic, addCommentsOnTopic, likeComment } = require('../controllers/protected/ForumTopicController');
const router = express.Router();

// Apply the token verification middleware to all routes in this router
router.use(verifyToken);

// Protected routes
router.get('/profile', getProfile);
router.post('/update-profile', editUserProfile);

router.get('/sign-out', logout);
router.post('/save-sidebar-data', saveSidebarData);
router.get('/get-sidebar-data', getSidebarData);
router.post('/check-password', checkPassword);
router.post('/verify-email', sendOtpVerificationOnEmail);
router.post('/cancel-email-change-request', cancelEmailChangeRequest);


router.post('/media/upload', uploadMediaToLibrary);
router.get('/media/all', getAllMedia);
router.get('/images/all', getAllImages);
router.put('/edit/media', editMedia);
router.delete('/delete/media/:media_id', deleteMedia);

router.post('/create-or-update/post', createEditPost);

router.post('/add-toddler', addToddlers)
router.get('/list-toddler', listToddlers)

router.post('/add-update-product/:id?', createAndUpdateProduct)
router.get('/list-all-products', getProducts);
router.get('/get-product-details/:id', getProductDetails);
router.put('/reserve-product/:id?', updateProductStatus)
router.put('/add-product-to-wishlist/:id?', addProductToWishlist)

router.post('/product/:productId/make-offer', makeAnOffer);
router.put('/product/update-offer/:offerId', updateOffer);

router.post('/bundle/:bundleId/make-offer', makeAnOfferForBundle);
router.put('/bundle/update-offer/:offerId', updateOfferForBundle);



router.get('/get-all-post/:post_type', getAllPosts);

router.get('/get-all-post-and-pages/:type', getAllPostTypesAndPages);
router.get('/get-post/:post_id', getPostById);
router.patch('/quick-edit-post/:post_id', quickEditPost);
router.delete('/delete-post/:post_id', deletePost);

router.post('/create-or-update/categories', createEditCategory);
router.get('/get-all-categories/:post_type', getAllCategories);
router.get('/get-category/:category_id', getCategoryById);

router.post('/create-or-update/custom-fields', createEditCustomField);
router.get('/get-all-custom-fields/:post_type', getAllCustomField);
router.get('/get-custom-field/:custom_field_id', getCustomFieldById);
router.delete('/delete/get-custom-field/:custom_field_id', deleteCustomField);


router.post('/create-edit-user', createOrEditUser);
router.get('/get-user-profile/:user_id', getUserProfile);
router.get('/get-recent-orders', getRecentOrders);
router.put('/review-order/:orderId', updateOrderReview);

router.get('/get-user-listings', getAllUser);
router.delete('/delete/user/:user_id', deleteUser);


router.post('/create-edit-website', createOrEditWebsite);
router.get('/get-website-listings', listWebsites);
router.get('/get-website-listings-with-menus', listWebsitesWithMenus);

router.get('/get-website/:website_id', getWebsite);
router.delete('/delete/website/:website_id', deleteWebsite);

router.get('/list-files', listFiles);

router.post('/create-transaction', createMolliePayment);
router.get('/get-payment-status', getPaymentStatus);
router.post('/add-funds', createMolliePaymentV2);


router.post('/cart/create-bundle', createBundle);
router.get('/list-bundle', listBundles);
router.get('/get-bundle/:id', getBundleById);


router.post('/chat/coach', createChatWithCoach);

router.post('/topic/createTopic', createTopic);
router.get('/topic/get-topic/:id', getTopicDetails);
router.get('/topic/get-topics-list', getTopicsList);
router.delete('/topic/delete-post/:id', deleteTopic);
router.put('/topic/update-topic/:id', updateTopic)
router.put('/topic/add-comment', addCommentsOnTopic);
router.put('/topic/perform-action/:action', actionOnTopic);

router.post("/topic/like-comment", likeComment);
router.post("/order/order-list/:type",)


module.exports = router;