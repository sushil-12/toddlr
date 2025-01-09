const express = require('express');
const { getAllDomain } = require('../controllers/common/DomainOperation');
const { createEditNavigationItem, getAllNavigationItems, getNavigationItemById, quickEditNavItem } = require('../controllers/common/NavigationController');
const { submitContactDetails, createChat, sendMessage, getMessages, getUserChats, deleteChat, ChatWithToddlerProfile } = require('../controllers/common/CommanController');
const router = express.Router();
const checkFormTypeMiddleware = require('../middleware/checkFormTypeMiddleware');
const { uploadMediaToLibrary } = require('../controllers/common/FileUploader');
const Chat = require('../models/Chat');
const { default: mongoose } = require('mongoose');
const { handleWebhook } = require('../controllers/protected/WebhookController');
// const { answerChildQuestion } = require('../controllers/protected/OpenAiController');
const { createChatWithCoach } = require('../controllers/protected/UserController');

router.get('/get-all-domains', getAllDomain);
// API routes
router.post('/create-or-edit/navigation-items', createEditNavigationItem);
router.get('/navigation-items', getAllNavigationItems);
router.get('/navigation-items/:navigation_item_id', getNavigationItemById);
router.patch('/navigation-item-quick-edit/:id', quickEditNavItem);

router.post('/media/upload', uploadMediaToLibrary);


// router.post('/contact', checkFormTypeMiddleware, submitContactDetails);
router.post('/contact', submitContactDetails);
// router.post('/answer-child-question', answerChildQuestion);




// Chat API

router.post('/chats', createChat);
router.post('/chat/coach', createChatWithCoach);

router.post('/chats/:chatId/messages', sendMessage);

router.get('/chats/:chatId/messages', getMessages);

router.get('/users/:userId/chats', getUserChats);

router.delete('/chats/:chatId', deleteChat);

router.post('/payment-webhook', handleWebhook)

router.post('/chat/completions', ChatWithToddlerProfile);
module.exports = router;