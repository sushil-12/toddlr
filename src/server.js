const http = require('http'); // Import HTTP to create a server
const { Server } = require('socket.io'); // Import Socket.io
const app = require('./app'); // Import your Express app
require('dotenv').config();
const tls = require('tls');
const Chat = require('./models/Chat');
const Offer = require('./models/Offer');
console.log(tls.TLSSocket.listenerCount('close'));

const PORT = process.env.PORT || 3000;

// Create an HTTP server
const server = http.createServer(app);

// Create a Socket.io server and attach it to the HTTP server
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow all origins
      callback(null, origin);
    },
    methods: ['GET', 'POST'],
    credentials: true, // Allow credentials
  },
});

// Socket.io connection setup
// Socket.io connection setup
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for 'joinChat' event to join a specific chat
  socket.on('joinChat', async (chatId) => {
    socket.join(chatId); // Join the chat room (chatId)
    console.log(`User ${socket.id} joined chat ${chatId}`);

    // Fetch chat history and send it to the client
    try {
      const chat = await Chat.findById(chatId).populate('messages.sender', 'username email');

      if (chat) {
        // Manipulate message content if necessary
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

        // Send the updated chat history to the client
        socket.emit('chatHistory', updatedMessages);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  });

  socket.on('updateMessage', async (chatId, messageKey, updatedContent) => {
    try {
      // Find the chat and update the specific message
      const chat = await Chat.findOneAndUpdate(
        { _id: chatId, "messages._id": messageKey },
        { $set: { "messages.$.content": updatedContent } },
        { new: true }
      ).populate('messages.sender', 'username email');

      if (chat) {
        // Emit the updated message to all participants
        socket.to(chatId).emit('messageUpdated', { messageKey, updatedContent });
      }
    } catch (error) {
      console.error('Error updating message:', error);
    }
  });

  // Listen for new messages
  socket.on('sendMessage', async (chatId, message) => {
    const { sender, content } = message;

    try {
      const chat = await Chat.findByIdAndUpdate(
        chatId,
        { $push: { messages: { sender, content } } },
        { new: true }
      ).populate('messages.sender', 'username email');

      console.log(chat);
      if (chat) {
        // Emit the message to all participants in the chat (excluding the sender)
        console.log(chatId);
        socket.to(chatId).emit('newMessage', { sender, content });
        console.log(chatId, "EVENT EMITTED");
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});