const {
  CustomError,
  ErrorHandler,
  ResponseHandler,
} = require("../../utils/responseHandler");
const sendMail = require("../../utils/sendMail");
const validator = require("validator");
const mongoose = require("mongoose");
const Chat = require("../../models/Chat"); // Assuming Chat model exists
const Offer = require("../../models/Offer");
const { default: OpenAI } = require("openai");
const { chat } = require("googleapis/build/src/apis/chat");
const { isCancel } = require("axios");

// Function to validate the input fields for contact
const validateContactDetails = (fname, email, message, subject) => {
  if (!fname || fname === "") {
    throw new CustomError(400, "First name is required!");
  }

  if (!email || email === "") {
    throw new CustomError(400, "Email is required!");
  } else if (!validator.isEmail(email)) {
    throw new CustomError(400, "Invalid email address!");
  }

  if (!message || message === "") {
    throw new CustomError(400, "Message is required!");
  } else if (message.length > 1000) {
    // Example length limit
    throw new CustomError(400, "Message is too long!");
  }

  if (!subject || subject === "") {
    throw new CustomError(400, "Subject is required");
  }
};

// Chat API - Create a new chat or fetch existing one
const createChat = async (req, res) => {
  const { participants } = req.body;

  if (participants.length !== 2) {
    throw new CustomError(400, "Exactly two participants are required");
  }

  try {
    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: participants },
    }).populate("messages.sender", "username email");
    if (!chat) {
      // Create a new chat
      chat = await Chat.create({ participants });
    }

    // Manipulate the messages if necessary
    const updatedMessages = await Promise.all(
      chat.messages.map(async (message) => {
        if (
          message.content &&
          typeof message.content === "object" &&
          message.content.offer_id
        ) {
          try {
            // Fetch the offer and populate it
            const offer = await Offer.findById(
              message.content.offer_id
            ).populate("product");
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
            console.error("Error populating offer:", err);
            message.content = {
              ...message.content,
              error: "Failed to fetch offer details",
            };
          }
        }
        return message;
      })
    );

    // Send the updated chat with manipulated messages
    ResponseHandler.success(
      res,
      { ...chat.toObject(), messages: updatedMessages },
      201
    );
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
        $set: { updatedAt: new Date() }, // Update the updatedAt field
      },
      { new: true }
    ).populate("messages.sender", "username email");
    if (!chat) {
      throw new CustomError(400, "Chat not found");
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
    const chat = await Chat.findById(chatId).populate({
      path: "messages",
      options: { sort: { timestamp: -1 } }, // Sort messages by timestamp in ascending order
      populate: {
        path: "sender",
        select: "username email", // Fetch sender details
      },
    });

    if (!chat) {
      throw new CustomError(400, "Chat not found");
    }
    if (chat) {
      chat.messages = chat.messages.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );
    }

    // Iterate through each message to check if message.content is an object and needs manipulation
    const updatedMessages = await Promise.all(
      chat.messages.map(async (message) => {
        if (
          message.content &&
          typeof message.content === "object" &&
          message.content.offer_id
        ) {
          try {
            // Fetch the offer and populate it
            const offer = await Offer.findById(
              message.content.offer_id
            ).populate("product");
            const messageContent = message.content;

            // Update the message content with populated offer details
            message.content = {
              isBundle: messageContent?.isBundle,
              bundleId: offer?.bundle?._id,
              offer_id: offer?._id,
              offer_price: messageContent.offer_price,
              product_name: offer.product?.title,
              condition: offer.product?.condition,
              seller_id:
                messageContent?.isBundle === true
                  ? messageContent.seller_id
                  : offer.product?.createdBy,
              product_image: offer.product?.images[0], // Assuming images is an array
              product_actual_price: offer.product?.price,
              status: messageContent.status,
              currentStatus: offer?.status,
              action_done: messageContent?.action_done || false,
              offer_description: messageContent.offer_description,
              productsList:
                messageContent?.isBundle === true
                  ? messageContent.productsList
                  : [],
            };
            console.log("UPDATED MESSAGE CONTENT===>", message.content);
          } catch (err) {
            console.error("Error populating offer:", err);
            message.content = {
              ...message.content,
              error: "Failed to fetch offer details",
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


const getUserChats = async (req, res) => {
  const { userId } = req.params;

  // Validate userId format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new CustomError(400, "Invalid user ID format");
  }

  try {
    // Find all chats where the user is a participant
    const chats = await Chat.find({ participants: userId })
      .populate("participants", "username email profile_pic") // Populate participants' details
      .populate({
        path: "messages",
        options: { sort: { createdAt: -1 } }, // Sort messages by most recent first
        select: "content createdAt readBy", // Select necessary message fields
      })
      .sort({ updatedAt: 1 }); // Sort chats by updatedAt field

    if (!chats || chats.length === 0) {
      return ResponseHandler.success(res, [], 200);
    }

    // Structure the chat data
    const userChats = chats.map((chat) => {
      // Identify the other participant
      const otherParticipant = chat.participants.find(
        (participant) => participant._id.toString() !== userId
      );

      // Calculate unread message count for the current user
      const unreadMessageCount = chat.messages.reduce((count, message) => {
        if (!message?.readBy?.includes(userId)) {
          return count + 1;
        }
        return count;
      }, 0);

      // Get the most recent message
      const recentMessage = chat.messages[chat.messages.length - 1];

      return {
        chatId: chat._id,
        otherUser: {
          userId: otherParticipant?._id,
          username: otherParticipant?.username,
          profilePicture: otherParticipant?.profile_pic || "", // Map profile_pic to profilePicture
        },
        recentMessage: {
          content: recentMessage?.content,
          createdAt: recentMessage?.createdAt,
        },
        unreadMessageCount,
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
      throw new CustomError(404, "Chat not found");
    }
    ResponseHandler.success(res, { message: "Chat deleted successfully" }, 200);
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
    timestamp: new Date().toISOString(),
  };

  try {
    // Validate the contact details
    validateContactDetails(fname, email, message, subject);

    const mailOptions = {
      from: email,
      to: process.env.CONTACT_SUPPORT_EMAIL,
      subject: subject,
      text: `${message}\n\nFrom: ${fname} <${email}>`,
    };

    // Send email
    await sendMail(mailOptions);
    ResponseHandler.success(
      res,
      { email_sent: true, message: "Message sent successfully" },
      200
    );
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const openai = new OpenAI();

const ChatWithToddlerProfile = async (req, res) => {
  const { toddler_id, toddlr, question, chatId, senderId, coachId } = req.body;

  if (!toddlr || !question) {
    throw new CustomError(400, "Toddler profile and question are required");
  }

  try {
    const prompt = `Provide a concise answer in not more than 100 words. Here is some information about the toddler: 
    Name: ${toddlr.name}, Age: ${toddlr.age}, Gender: ${toddlr.gender}. 
    Based on this profile, answer the following question: ${question}`;

    let chat;
    if (chatId && senderId) {
      chat = await Chat.findById(chatId);
      if (!chat) {
        throw new CustomError(404, "Chat not found");
      }
      const requestMessage = {
        sender: senderId,
        chatCreatedBy: senderId,
        isCoachChat:true,
        toddler: toddler_id,
        content: question,
        timestamp: new Date(),
      };

      chat.messages.push(requestMessage);
      chat.toddler = toddler_id;
      await chat.save();
    }

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
    });

    if (chatId && senderId) {
      chat = await Chat.findById(chatId);
      if (!chat) {
        throw new CustomError(404, "Chat not found");
      }

      console.log("completion?.choices[0]?.message?.content", completion?.choices[0]?.message?.content)
      const responseMessage = {
        sender: coachId,
        chatCreatedBy: senderId,
        toddler: toddler_id,
        content: completion?.choices[0]?.message?.content,
        timestamp: new Date(),
      };

      chat.messages.push(responseMessage);
      chat.isCoachChat = true;
      chat.chatCreatedBy = senderId;
      await chat.save();
    }

    const chatLastMessage = chat?.messages?.slice(-1)[0];
    ResponseHandler.success(res, chatLastMessage, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};


// Chat API - Bookmark a chat message
const bookmarkMessage = async (req, res) => {
  const { chatId, messageId } = req.body;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) {
      throw new CustomError(404, "Chat not found");
    }

    const message = chat.messages.id(messageId);
    if (!message) {
      throw new CustomError(404, "Message not found");
    }

    message.bookmarked = true;
    message.bookmarkedAt = new Date();

    await chat.save();

    ResponseHandler.success(res, { message: "Message bookmarked successfully" }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

// Chat API - Get bookmarked messages in a chat
const getBookmarkedMessages = async (req, res) => {
  const { senderId } = req.params;
  console.log("senderId", senderId);
  try {
    const chats = await Chat.find({ chatCreatedBy: senderId }).populate({
      path: "messages",
      match: { bookmarked: true }, // Filter messages to only include bookmarked ones
      populate: {
        path: "toddler",
      },
    });

    if (!chats || chats.length === 0) {
      throw new CustomError(404, "No chats found");
    }

    // Collect all bookmarked messages from all chats
    const bookmarkedMessages = chats.reduce((acc, chat) => {
      const messages = chat.messages.filter((message) => message.bookmarked);
      return acc.concat(messages);
    }, []);

    ResponseHandler.success(res, bookmarkedMessages, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

module.exports = {
  bookmarkMessage,
  getBookmarkedMessages,
  submitContactDetails,
  createChat,
  sendMessage,
  getMessages,
  getUserChats,
  ChatWithToddlerProfile,
  deleteChat,
};
