// src/routes/authRoutes.js
// require('dotenv').config();
// require('../config/passport-setup.js');
const express = require('express');
// const jwt = require('jsonwebtoken');
const authController = require('../controllers/auth/authController');
// const passport = require('passport');
const router = express.Router();

// // Auth with Google
// router.get('/google', passport.authenticate('google', {
//     scope: ['profile', 'email']
// }));

// // Callback route for Google to redirect to
// router.get('/google/callback', passport.authenticate('google'), (req, res) => {
//     // Successful authentication
//     const token = jwt.sign({ userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: process.env.TOKEN_DURATION });
//     res.redirect(`${process.env.FRONTEND_APP_URL}/login?token=${token}`); // Redirect to your frontend with the token
// });

router.post('/register', authController.register);
router.post('/resend-verification-link', authController.resendVerificationEmail);
router.post('/login', authController.login);
router.post('/verify_token', authController.verifyToken);
router.post('/social/login', authController.socialLogin);
router.post('/reset-password', authController.resetPassword);
router.post('/update-profile', authController.editProfile);
router.post('/check-username', authController.checkUsernameExists);
router.post('/check-email', authController.checkEmailExists);
router.post('/verify-email', authController.verifyEmail);
module.exports = router;
