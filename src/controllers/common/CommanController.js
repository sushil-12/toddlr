const { CustomError, ErrorHandler, ResponseHandler } = require("../../utils/responseHandler");
const sendMail = require("../../utils/sendMail");
const validator = require('validator');
const mongoose = require('mongoose');
const Chat = require('../../models/Chat'); // Assuming Chat model exists
const Offer = require("../../models/Offer");

// Function to validate the input fields for contact
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

// Chat API - Create a new chat or fetch existing one
const createChat = async (req, res) => {
  const { participants } = req.body;

  if (participants.length !== 2) {
    throw new CustomError(400, 'Exactly two participants are required');
  }

  try {
    // Check if chat already exists
    let chat = await Chat.findOne({ participants: { $all: participants } }).populate('messages.sender', 'username email');
    if (!chat) {
      // Create a new chat
      chat = await Chat.create({ participants });
    }

    // Manipulate the messages if necessary
    const updatedMessages = await Promise.all(
      chat.messages.map(async (message) => {
        if (message.content && typeof message.content === 'object' && message.content.offer_id) {
          try {
            // Fetch the offer and populate it
            const offer = await Offer.findById(message.content.offer_id).populate('product');
            const messageContent = message.content;
            // Update the message content with populated offer details
            message.content = {
              offer_id: offer?._id,
              offer_price: messageContent.offer_price,
              product_name: offer.product.title,
              seller_id: offer.product.createdBy,
              product_image: offer.product.images[0], // Assuming images is an array
              product_actual_price: offer.product.price,
              status: messageContent.status,
              currentStatus: offer?.status,
              action_done: messageContent?.action_done || false,
              offer_description: messageContent.offer_description,
            };
          } catch (err) {
            console.error('Error populating offer:', err);
            message.content = {
              ...message.content,
              error: 'Failed to fetch offer details'
            };
          }
        }
        return message;
      })
    );

    // Send the updated chat with manipulated messages
    ResponseHandler.success(res, { ...chat.toObject(), messages: updatedMessages }, 201);

  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

// Chat API - Send a message in a chat
const sendMessage = async (req, res) => {
  const { chatId } = req.params;
  const { sender, content } = req.body;

  try {
    const chat = await Chat.findByIdAndUpdate(
      chatId,
      {
        $push: { messages: { sender, content } },
      },
      { new: true }
    ).populate('messages.sender', 'username email');
    if (!chat) {
      throw new CustomError(400, 'Chat not found');
    }
    ResponseHandler.success(res, chat, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

// Chat API - Get all messages in a chat
const getMessages = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await Chat.findById(chatId)
      .populate({
        path: 'messages',
        options: { sort: { timestamp: 1 } }, // Sort messages by timestamp in ascending order
        populate: {
          path: 'sender',
          select: 'username email', // Fetch sender details
        },
      });

    if (!chat) {
      throw new CustomError(400, 'Chat not found');
    }

    // Iterate through each message to check if message.content is an object and needs manipulation
    const updatedMessages = await Promise.all(
      chat.messages.map(async (message) => {
        if (message.content && typeof message.content === 'object' && message.content.offer_id) {
          try {
            // Fetch the offer and populate it
            const offer = await Offer.findById(message.content.offer_id).populate('product');
            const messageContent = message.content;
            // Update the message content with populated offer details
            message.content = {
              offer_id: offer?._id,
              offer_price: messageContent.offer_price,
              product_name: offer.product.title,
              seller_id: offer.product.createdBy,
              product_image: offer.product.images[0], // Assuming images is an array
              product_actual_price: offer.product.price,
              status: messageContent.status,
              currentStatus: offer?.status,
              action_done: messageContent?.action_done || false,
              offer_description: messageContent.offer_description,
            };
          } catch (err) {
            console.error('Error populating offer:', err);
            message.content = {
              ...message.content,
              error: 'Failed to fetch offer details'
            };
          }
        }
        return message;
      })
    );

    // Send the updated messages in the response
    ResponseHandler.success(res, updatedMessages, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};


// Chat API - Get all chats for a specific user
// const getUserChats = async (req, res) => {
//   const { userId } = req.params;

//   // Validate userId format
//   if (!mongoose.Types.ObjectId.isValid(userId)) {
//     throw new CustomError(400, 'Invalid user ID format');
//   }

//   try {
//     // Find all chats where the user is a participant
//     const chats = await Chat.find({ participants: userId })
//       .populate('participants', 'username email'); // Populate participants' name and email

//     if (!chats || chats.length === 0) {
//       throw new CustomError(404, 'No chats found for this user');
//     }

//     // Iterate through each chat and check message contents
//     const updatedChats = await Promise.all(
//       chats.map(async (chat) => {
//         // Modify messages if necessary
//         const updatedMessages = await Promise.all(
//           chat.messages.map(async (message) => {
//             if (message.content && typeof message.content === 'object' && message.content.offer_id) {
//               try {
//                 // Fetch the offer and populate it
//                 const offer = await Offer.findById(message.content.offer_id).populate('product');
//                 const messageContent = message.content;
//                 // Update the message content with populated offer details
//                 message.content = {
//                   offer_id: offer?._id,
//                   offer_price: messageContent.offer_price,
//                   product_name: offer.product.title,
//                   seller_id: offer.product.createdBy,
//                   product_image: offer.product.images[0], // Assuming images is an array
//                   product_actual_price: offer.product.price,
//                   status: messageContent.status,
//                   currentStatus: offer?.status,
//                   action_done: messageContent?.action_done || false,
//                   offer_description: messageContent.offer_description,
//                 };
//               } catch (err) {
//                 console.error('Error populating offer:', err);
//                 message.content = {
//                   ...message.content,
//                   error: 'Failed to fetch offer details'
//                 };
//               }
//             }
//             return message;
//           })
//         );

//         // Replace the chat messages with updated ones
//         chat.messages = updatedMessages;
//         return chat;
//       })
//     );

//     // Send the updated chats in the response
//     ResponseHandler.success(res, updatedChats, 200);
//   } catch (error) {
//     ErrorHandler.handleError(error, res);
//   }
// };

const getUserChats = async (req, res) => {
  const { userId } = req.params;

  // Validate userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new CustomError(400, 'Invalid user ID format');
  }

  try {
    // Find all chats where the user is a participant
    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'username email profilePicture') // Populate participants' details
      .populate({
        path: 'messages',
        options: { sort: { createdAt: -1 } }, // Sort messages by recent first
        select: 'content createdAt', // Select required message fields
      });

    if (!chats || chats.length === 0) {
      throw new CustomError(404, 'No chats found for this user');
    }

    // Structure the chat data
    const userChats = chats.map((chat) => {
      // Identify the other participant
      const otherParticipant = chat.participants.find(
        (participant) => participant._id.toString() !== userId
      );
      const otherUser = User.find()

      // Calculate unread message count for the current user
      // const unreadMessageCount = chat.messages.reduce((count, message) => {
      //   if (!message?.readBy.includes(userId)) {
      //     return count + 1;
      //   }
      //   return count;
      // }, 0);

      // Get the most recent message
      const recentMessage = chat.messages[0];

      return {
        chatId: chat._id,
        otherUser: {
          userId: otherParticipant._id,
          username: otherParticipant.username,
          profilePicture: otherParticipant.profilePicture,
        },
        recentMessage: {
          content: recentMessage?.content,
          createdAt: recentMessage?.createdAt,
        },
        unreadMessageCount: 3,
      };
    });

    // Send the user chats in the response
    ResponseHandler.success(res, userChats, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};


// Chat API - Delete a chat
const deleteChat = async (req, res) => {
  const { chatId } = req.params;

  try {
    const chat = await Chat.findByIdAndDelete(chatId);
    if (!chat) {
      throw new CustomError(404, 'Chat not found')
    }
    ResponseHandler.success(res, { message: 'Chat deleted successfully' }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
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
    ResponseHandler.success(res, { email_sent: true, message: "Message sent successfully" }, 200);

  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

module.exports = {
  submitContactDetails,
  createChat,
  sendMessage,
  getMessages,
  getUserChats,
  deleteChat
};