const nodemailer = require('nodemailer');

// Constants
const ADMIN_EMAIL = 'sushil124maurya@gmail.com'; // Replace with your Gmail address
const APP_NAME = 'toddlr';
const FROM_NAME = `"${APP_NAME}" <${ADMIN_EMAIL}>`;

// Configure nodemailer transport using Gmail's SMTP
const mailTransport = nodemailer.createTransport({
  service: 'gmail', // Specify Gmail service
  auth: {
    user: ADMIN_EMAIL, // Gmail account email
    pass: 'fddhdktfhfvbhppe' // Gmail account password or app password (if 2FA is enabled)
  }
});

// Function to create an email
const createMail = async (options) => {
  return new Promise((resolve, reject) => {
    const mailOptions = {
      from: FROM_NAME, // Sender's email and name
      to: options.to,  // Recipient's email
      subject: options.subject, // Email subject
      text: options.text, // Plain text body
      html: options.html // HTML body (optional)
    };
    
    resolve(mailOptions);
  });
};

// Function to send an email via SMTP
const sendMail = async (options) => {
  try {
    // Create the email message
    const mailOptions = await createMail(options);
    // Send the email using Gmail SMTP transport
    const info = await mailTransport.sendMail(mailOptions);

    console.log('Email sent successfully:', info.response);
    return 'Email sent successfully.';
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Error sending email.');
  }
};

module.exports = sendMail;
