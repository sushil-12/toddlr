// src/routes/authRoutes.js
const express = require('express');
const authController = require('../controllers/auth/authController');

const router = express.Router();

router.post('/register', authController.register);
router.post('/resend-verification-link', authController.resendVerificationEmail);
router.post('/login',  authController.login);
router.post('/reset-password', authController.resetPassword);
router.post('/update-profile', authController.editProfile);
router.post('/check-username', authController.checkUsernameExists);
router.post('/check-email', authController.checkEmailExists);

router.post('/verify-email', authController.verifyEmail);


module.exports = router;
