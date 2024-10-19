const express = require('express');
const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const MailComposer = require('nodemailer/lib/mail-composer');

// Constants
const ADMIN_EMAIL = 'uno@hegroup.com';
const APP_NAME = 'Hegroup';
const FROM_NAME = `"${APP_NAME}" <${ADMIN_EMAIL}>`;

// Configure nodemailer transport
const mailTransport = nodemailer.createTransport({
  streamTransport: true,
  newline: 'unix',
  buffer: true
});

// Function to send the MIME message using Gmail API
async function sendMimeMessage(mimeMessage) {
  const jwtClient = new google.auth.JWT({
    email: process.env.CLIENT_EMAIL,
    key: process.env.PRIVATE_KEY.replace(/\\n/g, '\n'), // Replace escaped newlines
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    subject: ADMIN_EMAIL
  });

  try {
    // Authorize the JWT client and get a token to make API calls
    await jwtClient.authorize();

    const gmail = google.gmail({ version: 'v1', auth: jwtClient });

    // Send the email using the Gmail API
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw: mimeMessage }
    });

    console.log('Email sent:', response.data);
  } catch (error) {
    if (error.response && error.response.data) {
      console.error('Error details:', error.response.data);
    }
    throw error;
  }
}

// Function to create a MIME message using Nodemailer's MailComposer
const createMail = async (options) => {
  return new Promise((resolve, reject) => {
    const mailComposer = new MailComposer(options);
    
    // Generate the email message
    mailComposer.compile().build(async (err, message) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        // Convert the message to a string
        const messageString = message.toString();

        // Encode the message string in Base64
        const rawMessage = Buffer.from(messageString).toString('base64');

        resolve(rawMessage);
      } catch (error) {
        reject(error);
      }
    });
  });
};

// Function to send an email
const sendMail = async (options) => {
  try {
    // Create the MIME message using Nodemailer's MailComposer
    const rawMessage = await createMail(options);

    // Send the MIME message via Gmail API
    await sendMimeMessage(rawMessage);

    console.log('Email sent successfully.');
    return 'Email sent successfully.';
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Error sending email.');
  }
};

module.exports = sendMail;
