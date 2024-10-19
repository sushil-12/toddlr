const express = require('express');
const { verifyToken } = require('../middleware/authMiddleware');
const { getProfile, checkPassword, sendOtpVerificationOnEmail, logout, saveSidebarData, getSidebarData, verifyEmail, cancelEmailChangeRequest, createOrEditUser, getUserProfile, getAllUser, deleteUser } = require('../controllers/protected/UserController');
const { uploadMediaToLibrary, deleteMedia } = require('../controllers/common/FileUploader');
const { getAllMedia, editMedia, getAllImages } = require('../controllers/common/MediaOperations');
const { createEditPost, getAllPosts, getPostById, deletePost, quickEditPost, getAllPostTypesAndPages, listFiles } = require('../controllers/protected/PostOperations');
const { createEditCategory, getAllCategories, getCategoryById } = require('../controllers/protected/CategoryController');
const { createEditCustomField, getAllCustomField, getCustomFieldById, deleteCustomField } = require('../controllers/protected/CustomFieldTemplateController');
const { createOrEditWebsite, listWebsites, getWebsite, listWebsitesWithMenus, deleteWebsite } = require('../controllers/protected/WebsiteController');

const router = express.Router();

// Apply the token verification middleware to all routes in this router
router.use(verifyToken);

// Protected routes
router.get('/profile', getProfile);
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

router.get('/get-user-listings', getAllUser);
router.delete('/delete/user/:user_id', deleteUser);


router.post('/create-edit-website', createOrEditWebsite);
router.get('/get-website-listings', listWebsites);
router.get('/get-website-listings-with-menus', listWebsitesWithMenus);

router.get('/get-website/:website_id', getWebsite);
router.delete('/delete/website/:website_id', deleteWebsite);

router.get('/list-files', listFiles);

module.exports = router;