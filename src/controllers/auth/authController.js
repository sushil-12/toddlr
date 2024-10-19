const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Role = require('../../models/Role');
const express = require('express');
const { CustomError, ErrorHandler, ResponseHandler } = require('../../utils/responseHandler');
const AuthValidator = require('../../validator/AuthValidator');
const { HTTP_STATUS_CODES, HTTP_STATUS_MESSAGES } = require('../../constants/error_message_codes');
const sendMail = require('../../utils/sendMail');
const fs = require('fs');
const handlebars = require('handlebars');
const crypto = require('crypto');
const cloudinary = require('../../config/cloudinary');
const path = require('path');
const { Readable } = require('stream');
const useragent = require('express-useragent'); // Import express-useragent
const { default: mongoose } = require('mongoose');

const app = express();
app.use(useragent.express());

const generateRandomString = (length) => {
  const charset = '0123456789'; // Only digits
  let randomString = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    randomString += charset[randomIndex];
  }
  return randomString;
};

const register = async (req, res) => {
  // const resettemplateFilePath = path.join(__dirname, '..', '..', 'email-templates', 'reset-password.hbs');
  // const templateFile = fs.readFileSync(resettemplateFilePath, 'utf8');
  // const template = handlebars.compile(templateFile);
  // const mailOptions = {
  //   from: `"${'app_name'}" <${process.env.EMAIL_FROM}>`,
  //   to: 'sushil124maurya@gmail.com',
  //   subject: 'Password Reset',
  //   html: template({ name: "sdsd", resetLink: "resetLink", app_logo: "app_logo", app_name: "app_name" })
  // };
 
  // // Send email
  // sendMail(mailOptions)
  //   .then(() => {
  //     ResponseHandler.success(res, { reset_link_sent: true, message: "Reset link sent successfully" }, HTTP_STATUS_CODES.OK);
  //   })
  //   .catch((error) => {
  //     console.log(error)
  //     ResponseHandler.error(res, { reset_link_sent: false, message: "Failed to send Reset link" }, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
  //   });

  try {
    AuthValidator.validateRegistration(req.body);
    const { username, password, email, phoneNumber } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user instance
    const newUser = new User({
      username,
      password: hashedPassword,
      email,
      phoneNumber, // Include the mobile number in the user creation
    });

    // Save the new user in the database
    await newUser.save();

    // Respond with success message
    ResponseHandler.success(res, { message: 'User registered successfully' }, HTTP_STATUS_CODES.OK);
  } catch (error) {
    // Handle any errors
    ErrorHandler.handleError(error, res);
  }
};


const login = async (req, res) => {
  try {
    let otp;
    AuthValidator.validateLogin(req.body);
    const { username, password, email, staySignedIn, form_type, verification_code, recaptcha_key } = req.body;

    const user = username
      ? await User.findOne({ username, deleted_at: null })
      : await User.findOne({ email, deleted_at: null });
    let sign_in_stamp = new Date();
    if (!user) {
      ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'email', message: "Wrong Credentials" }, HTTP_STATUS_CODES.UNAUTHORIZED);
      return;
    }
    if (user.login_expired_till != null && user.login_expired_till > new Date()) {
      let timeDifference = user.login_expired_till - new Date();
      let remainingTime = new Date(timeDifference).toISOString().substr(11, 8); // Convert time difference to HH:mm:ss format
      let expired_message = 'You have been restricted! Please try again after ' + remainingTime;
      ResponseHandler.restrict(res, HTTP_STATUS_CODES.UNAUTHORIZED, { toast_error: true, toast_message: expired_message, message: expired_message }, HTTP_STATUS_CODES.UNAUTHORIZED);
      return;
    }
    if (form_type == 'forgot_password_form') {
      try {
        const resettemplateFilePath = path.join(__dirname, '..', '..', 'email-templates', 'reset-password.hbs');
        const templateFile = fs.readFileSync(resettemplateFilePath, 'utf8');
        const resetToken = generateRandomString(32);
        user.resetToken = resetToken;
        user.resetTokenExpiry = new Date(Date.now() + parseInt(process.env.RESET_TOKEN_EXPIRY));
        await user.save();
        const resetLink = `${process.env.FRONTEND_APP_URL}${process.env.RESET_PASSWORD_URL}/${resetToken}`;
        const template = handlebars.compile(templateFile);
        const app_logo = `${process.env.APP_LOGO_PATH}`;
        const app_name = process.env.APP_NAME;
        const mailOptions = {
          from: `"${app_name}" <${process.env.EMAIL_FROM}>`,
          to: email,
          subject: 'Password Reset',
          html: template({ name: user.username, resetLink, app_logo, app_name })
        };

        // Send email
        sendMail(mailOptions)
          .then(() => {
            ResponseHandler.success(res, { reset_link_sent: true, message: "Reset link sent successfully" }, HTTP_STATUS_CODES.OK);
          })
          .catch((error) => {
            console.log(error)
            ResponseHandler.error(res, { reset_link_sent: false, message: "Failed to send Reset link" }, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
          });
      } catch (error) {
        console.log(error)
        ResponseHandler.error(res, { reset_link_sent: false, message: "Failed to send Reset link" }, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
      }
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    let incorrectAttempts = user.incorrectAttempts || 0;
    if (!passwordMatch) {
      let rem_attempts = 0;
      incorrectAttempts = incorrectAttempts + 1;
      rem_attempts = parseInt(process.env.WRONG_ATTEMPT_COUNT - incorrectAttempts);
      if (incorrectAttempts > process.env.WRONG_ATTEMPT_COUNT || incorrectAttempts == process.env.WRONG_ATTEMPT_COUNT) {
        let toast_messaage = '';
        if (user.lastIncorrectNotificationAttempt == 0) {
          toast_messaage = 'Restricted for 30 minutes';
          restricted_till = parseInt(process.env.FIRST_TIME_BLOCK_DURATION);
          user.login_expired_till = new Date(Date.now() + parseInt(process.env.FIRST_TIME_BLOCK_DURATION));
          user.lastIncorrectNotificationAttempt = 1;
          user.incorrectAttempts = 0;
          user.save();
        }
        else {
          toast_messaage = 'Restricted for 24 hours';
          restricted_till = parseInt(process.env.SECOND_TIME_BLOCK_DURATION);
          user.login_expired_till = new Date(Date.now() + parseInt(process.env.SECOND_TIME_BLOCK_DURATION));
          user.lastIncorrectNotificationAttempt = 1;
          user.incorrectAttempts = 0;
          user.save();
        }
        ResponseHandler.restrict(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'password', toast_error: true, toast_message: toast_messaage, message: "Wrong Credentials", attempts_remaining: rem_attempts, restricted_till }, HTTP_STATUS_CODES.UNAUTHORIZED);
        return;
      } else {
        user.incorrectAttempts = incorrectAttempts;
        user.save();
      }
      ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'password', message: "Wrong Credentials", attempts_remaining: rem_attempts }, HTTP_STATUS_CODES.UNAUTHORIZED);
      return;
      // throw new CustomError(HTTP_STATUS_CODES.UNAUTHORIZED, HTTP_STATUS_MESSAGES.UNAUTHORIZED);
    }

    if (form_type == 'verify_account_form') {
      if (verification_code !== user.otp || new Date() > user.otpExpiry) {
        ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'verification_code', message: "Wrong Code" }, HTTP_STATUS_CODES.UNAUTHORIZED); return;
      }
    }

    if (form_type === 'login_form') {
      otp = generateRandomString(6);

      // When user tries to login we will save its OTP and OTP Expiry
      user.otp = otp;
      user.otpExpiry = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_DURATION));
      user.login_expired_till = null;
      user.lastIncorrectNotificationAttempt = 0;
      user.incorrectAttempts = 0;
      await user.save();
      try {
        const templateFilePath = path.join(__dirname, '..', '..', 'email-templates', 'send-verification-code.hbs');
        const templateFile = fs.readFileSync(templateFilePath, 'utf8');
        const template = handlebars.compile(templateFile);
        const app_logo = `${process.env.APP_LOGO_PATH}`;
        const app_name = process.env.APP_NAME;

        const mailOptions = {
          from: `"${app_name}" <${process.env.EMAIL_FROM}>`,
          to: email,
          subject: 'Account Verification Email',
          html: template({ otp, app_logo, app_name })
        };
        console.log("MAIL OPTIONS", mailOptions)
        // Send email
        sendMail(mailOptions)
          .then(() => {
            ResponseHandler.success(res, { email_sent: true, otp, message: "Verification code sent successfully" }, HTTP_STATUS_CODES.OK);
          })
          .catch((error) => {
            console.log(error, "EROR")
            ResponseHandler.error(res, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, { field_error: 'password', email_sent: false, message: "Failed to send verification code" }, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR); return;
          });
      } catch (error) {
        ErrorHandler.handleError(error, res);
      }
      return;
    }

    const token_expiry = staySignedIn == 'yes' ? process.env.STAY_SIGNEDIN_TOKEN_DURATION : process.env.NORMAL_TOKEN_DURATION;
    console.log(token_expiry, "TOKEN EXPORT")
    user.staySignedIn = staySignedIn;
    user.signInTimestamp = sign_in_stamp
    user.save();
    let userData = await User.findById(user._id).populate('role');
    console.log(userData.role.name);
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: token_expiry });

    ResponseHandler.success(res, { token }, HTTP_STATUS_CODES.OK);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password, reset_token } = req.body;
    const user = await User.findOne({ resetToken: reset_token });
    if (!user) {
      throw new CustomError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Reset Link might be expired or not exists!');
    }
    if (user.resetTokenExpiry < new Date()) {
      throw new CustomError(HTTP_STATUS_CODES.UNAUTHORIZED, 'Reset Link might be expired or not exists!');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.staySignedIn = false;
    user.signInTimestamp = new Date();

    await user.save();
    user.resetToken = undefined;
    await user.save();
    ResponseHandler.success(res, { password_reset: true, message: "Password reset successfully" }, HTTP_STATUS_CODES.OK);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const editProfile = async (req, res) => {
  try {
    const { name, bio, id, profile_pic, email, password } = req.body;
    const user = await User.findOne({ _id: id });

    if (!user) {
      throw new CustomError(HTTP_STATUS_CODES.UNAUTHORIZED, 'User might not exist!');
    }

    if (profile_pic) {
      const base64String = profile_pic;
      const buffer = Buffer.from(base64String, 'base64');
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      let uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({ folder: 'profile_pictures' },
          (error, result) => {
            if (error) {
              console.error('Upload error:', error);
              reject(error);
            } else {
              user.profile_pic = result.secure_url;
              resolve();
            }
          }
        );

        readableStream.pipe(uploadStream);
      });

      await uploadPromise;
      await user.save();
    }
    else if (profile_pic == '') {
      user.profile_pic = '';
    }


    if (password && password != '' && password.length > 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    if (email && email != '' && email.length > 0) {
      user.email = email;
    }

    user.username = name;
    user.bio = bio;
    await user.save();

    ResponseHandler.success(res, { user: user, message: "Profile Updated successfully" }, HTTP_STATUS_CODES.OK);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const checkUsernameExists = async (req, res) => {
  try {
    const { username } = req.body;
    const existingUser = await User.findOne({ username });
    const isUsernameAvailable = !existingUser;
    const message = !isUsernameAvailable ? 'It looks like this username is already taken' : 'Username is availaible';
    ResponseHandler.success(res, { isUsernameAvailable, message }, HTTP_STATUS_CODES.OK);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const checkEmailExists = async (req, res) => {
  try {
    const { email } = req.body;
    const existingUser = await User.findOne({ email });
    const isEmailAvailable = !existingUser;
    const message = !isEmailAvailable ? 'It looks like this email is already taken' : 'Email is availaible';
    ResponseHandler.success(res, { isEmailAvailable, message }, HTTP_STATUS_CODES.OK);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token, uniqueId, email } = req.body;
    const decodedToken = decodeURIComponent(token);
    const decodedUniqueId = decodeURIComponent(uniqueId);
    const decodedEmail = atob(email);
    if (!mongoose.Types.ObjectId.isValid(uniqueId)) {
      return ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'verification_code', message: 'This link has been expired or not exists Please generate a new one.' });
    }

    const user = await User.findById(decodedUniqueId);
    // Check if the user exists

    if (new Date() > user.verificationLinkExpiryTime) {
      return ResponseHandler.error(res, HTTP_STATUS_CODES.NOT_FOUND, { message: 'This link has been expired! Please generate a new one.' });
    }
    
    if (!user) {
      return ResponseHandler.error(res, HTTP_STATUS_CODES.NOT_FOUND, { message: 'This link has been expired please generate a new one.' });
    }
    // Check if the verification token matches
    if (decodedToken !== user.otp) {
      return ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'verification_code', message: 'This link has been expired please generate a new one.' });
    }

    // Check if the OTP has expired
    if (new Date() > user.otpExpiry) {
      return ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'verification_code', message: 'This link has been expired please generate a new one.' });
    }
    user.isEmailVerified = true;
    user.temp_email = '';
    user.email = decodedEmail;
    try {
      await user.save();
    } catch (error) {
      console.log(error);
    }
    ResponseHandler.success(res, { verified: true, message: "Email verified successfully" }, HTTP_STATUS_CODES.OK);
    return;
  } catch (error) {
    console.log(error)
    return ErrorHandler.handleError(error, res);
  }
};

module.exports = {
  register,
  login,
  editProfile,
  verifyEmail,
  resetPassword,
  checkUsernameExists,
  checkEmailExists,
  generateRandomString
};
