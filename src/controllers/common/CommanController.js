const { contactLogger } = require("../../logger");
const { CustomError, ErrorHandler, ResponseHandler } = require("../../utils/responseHandler");
const sendMail = require("../../utils/sendMail");
const validator = require('validator');

// Function to validate the input fields
const validateContactDetails = (fname, email, message, subject) => {
    if (!fname || fname === '') {
      throw new CustomError(400, 'First name is required!');
    }
  
    if (!email || email === '') {
      throw new CustomError(400, 'Email is required!');
    } else if (!validator.isEmail(email)) {
      throw new CustomError(400, 'Invalid email address!');
    }
  
    if (!message || message === '') {
      throw new CustomError(400, 'Message is required!');
    } else if (message.length > 1000) { // Example length limit
      throw new CustomError(400, 'Message is too long!');
    }
  
    if (!subject || subject === '') {
      throw new CustomError(400, 'Subject is required');
    }
  };

// Function to create the contact API
const submitContactDetails = async (req, res) => {
    const { fname, email, message, subject } = req.body;

    // Save payload for logging purposes
    const payload = {
        fname,
        email,
        message,
        subject,
        timestamp: new Date().toISOString()
    };

    try {
        // Validate the contact details
        validateContactDetails(fname, email, message, subject);

        const mailOptions = {
            from: email,
            to: process.env.CONTACT_SUPPORT_EMAIL,
            subject: subject,
            text: `${message}\n\nFrom: ${fname} <${email}>`
        };

        // Send email
        await sendMail(mailOptions);
        contactLogger.info(`Message sent successfully from ${fname} <${email}> with subject "${subject}"`);
        ResponseHandler.success(res, { email_sent: true, message: "Message sent successfully" }, 200);

    } catch (error) {
        if (error instanceof CustomError) {
            contactLogger.error(`Validation error: ${error.message}`);
            contactLogger.error(`Failed payload: ${JSON.stringify(payload)}`);
            ErrorHandler.handleError(error, res);
        } else {
            contactLogger.error(`Unexpected error: ${error.message}`);
            contactLogger.error(`Failed payload: ${JSON.stringify(payload)}`);
            ErrorHandler.handleError(error, res);
        }
    }
};

module.exports = { submitContactDetails };
