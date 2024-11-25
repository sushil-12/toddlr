'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const DashboardPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [chatId, setChatId] = useState(null);

  // Initialize the socket
  const socket = io('https://toddlrapi.vercel.app');
  console.log(socket);

  useEffect(() => {
    return () => {
      socket.disconnect(); // Disconnect socket on unmount
    };
  }, []);

  // // Fetch users on initial load
  // useEffect(() => {
  //   const userData = JSON.parse(localStorage.getItem('user'));
  //   const token = userData?.data?.token;
  //   setCurrentUser(userData);
  //   const fetchUsers = async () => {
  //     try {
  //       if (!token) {
  //         throw new Error('No token found. Please log in.');
  //       }

  //       const response = await fetch('http://localhost:3000/api/get-user-listings', {
  //         method: 'GET',
  //         headers: {
  //           'Content-Type': 'application/json',
  //           Authorization: `Bearer ${token}`,
  //         },
  //       });

  //       if (!response.ok) {
  //         throw new Error('Failed to fetch user listings');
  //       }

  //       const data = await response.json();
  //       console.log(data?.data?.userData);
  //       setUsers(data?.data?.userData);
  //     } catch (err) {
  //       setError(err.message);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchUsers();
  // }, []);

  // // Join chat when a user is selected
  // useEffect(() => {
  //   if (selectedUser?.id) {
  //     const fetchChat = async () => {
  //       try {
  //         const response = await fetch('http://localhost:3000/api/common/chats', {
  //           method: 'POST',
  //           headers: {
  //             'Content-Type': 'application/json',
  //           },
  //           body: JSON.stringify({ participants: [currentUser?.data?._id, selectedUser.id] }),
  //         });

  //         if (!response.ok) {
  //           throw new Error('Failed to fetch or create chat');
  //         }

  //         const chatData = await response.json();
  //         console.log(chatData, "CHAT DATA ", chatData?.data?._id)
  //         setChatId(chatData?.data?._id);
  //         setMessages(chatData?.data?.messages);

  //         // Join the chat room
  //         socket.emit('joinChat', chatData?.data?._id);

  //         // Listen for chat history
  //         socket.on('chatHistory', (messages) => {
  //           setMessages(messages);
  //         });

  //         // Listen for new messages
  //         socket.on('newMessage', (message) => {
  //           setMessages((prevMessages) => [...prevMessages, message]);
  //         });
  //       } catch (err) {
  //         setError(err.message);
  //       }
  //     };

  //     fetchChat();
  //   }

  //   // Cleanup on user change
  //   return () => {
  //     if (chatId) {
  //       socket.off('chatHistory');
  //       socket.off('newMessage');
  //     }
  //   };
  // }, [selectedUser]);

  // // Send a new message
  // const handleSendMessage = () => {
  //   if (messageInput.trim() && chatId) {
  //     const message = {
  //       sender: currentUser?.data?._id,
  //       content: messageInput,
  //     };

  //     socket.emit('sendMessage', chatId, message);
  //     // setMessages((prevMessages) => [...prevMessages, message]);
  //     setMessageInput('');
  //   }
  // };

  if (loading) {
    return <div className="text-center mt-10">Loading...</div>;
  }

  if (error) {
    return <div className="text-center mt-10 text-red-500">{error}</div>;
  }

  const OfferChatComponent = ({ content, messageKey }) => {
    const [isCounterOfferModalOpen, setIsCounterOfferModalOpen] = useState(false);
    const [counterPrice, setCounterPrice] = useState(0);
    const [counterDescription, setCounterDescription] = useState('');
    const [action, setAction] = useState('counter');

    const handleCounterOffer = async () => {
      const offerId = content.offer_id; // Assuming offer_id is available in content
      // Prepare the data to be sent in the request
      const counterOfferData = {
        action: action,
        counter_price: counterPrice,
        counter_description: counterDescription,
        messageKey
      };

      try {
        // Send the counter offer data via fetch request
        const response = await fetch(`http://localhost:3000/api/product/update-offer/${offerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json', // Tell the server you're sending JSON
            Authorization: `Bearer ${currentUser?.data?.token}`,
          },
          body: JSON.stringify(counterOfferData), // Send the data as JSON
        });

        if (response.ok) {
          // Successfully updated the offer
          const responseData = await response.json();
          console.log('Counter offer updated successfully:', responseData.data);
          // Emit the update to Socket.io
          socket.emit('updateMessage', chatId, messageKey, {
            ...content,
            action_done: true, // Example update
            counter_price: counterPrice,
            counter_description: counterDescription,
          });

          // Re-fetch the chat history to reflect updates
          socket.emit('joinChat', chatId);
          socket.on('chatHistory', (messages) => {
            console.log(messages);
            setMessages(messages);
          });
          setIsCounterOfferModalOpen(false); // Close the modal after successful submission
        } else {
          // Handle any non-200 status codes if needed
          console.log('Error updating counter offer:', response);
        }
      } catch (error) {
        // Handle error during API request
        console.error('API request failed:', error);
      }
    };

    return (
      <div className="bg-green-100 p-4 rounded-lg shadow-md">
        <div className='flex justify-between'>
          <h3 className="text-lg font-bold text-green-700">Offer Details</h3>
          <span className="bg-blue-100 text-blue-800 font-medium me-2 px-2.5 py-0.5 text-sm rounded-full dark:bg-blue-900 dark:text-blue-300">{content?.currentStatus}</span>
        </div>

        <p className="text-sm text-gray-700">
          <strong>Offer Price:</strong> ${content.offer_price}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Product Name:</strong> {content.product_name}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Product Actual Price:</strong> ${content.product_actual_price}
        </p>
        <p className="text-sm text-gray-700">
          <strong>Offer Description:</strong> {content.offer_description}
        </p>

        {content?.status === 'pending' && content?.seller_id == currentUser?.data?._id && (
          <div className="flex flex-col text-sm gap-2">
            <button className="text-green-500 text-sm border border-green-600 rounded-md p-2  disabled:text-gray-400 disabled:border-gray-500" disabled={content?.action_done} onClick={() => { setAction('accept'); handleCounterOffer(); }}>
              Accept
            </button>
            <button
              className="text-yellow-300 text-sm border border-yellow-600 rounded-md p-2 disabled:text-gray-400 disabled:border-gray-500" disabled={content?.action_done}
              onClick={() => setIsCounterOfferModalOpen(true)}
            >
              Counter Offer
            </button>
            <button className="text-red-600 text-sm border border-red-600 rounded-md p-2 disabled:text-gray-400 disabled:border-gray-500" disabled={content?.action_done} onClick={() => { setAction('decline'); handleCounterOffer(); }}>
              Reject
            </button>
          </div>
        )}
        {content?.status === 'counter' && content?.seller_id !== currentUser?.data?._id && (
          <div className="flex flex-col text-sm gap-2">
            <button className="text-green-500 text-sm border border-green-600 rounded-md p-2 disabled:text-gray-400 disabled:border-gray-500" disabled={content?.action_done} onClick={() => { setAction('accept'); handleCounterOffer(); }}>
              Accept Counter Offer
            </button>
            <button className="text-red-600 text-sm border border-red-600 rounded-md p-2 disabled:text-gray-400 disabled:border-gray-500" disabled={content?.action_done} onClick={() => { setAction('decline'); handleCounterOffer(); }}>
              Reject Counter Offer
            </button>
          </div>
        )}

        {content?.status === 'accepted' && content?.seller_id !== currentUser?.data?._id && (
          <div className="flex flex-col text-sm gap-2">
            <button className="text-green-500 text-sm border border-green-600 rounded-md p-2 disabled:text-gray-400 disabled:border-gray-500" disabled={content?.action_done} onClick={() => { alert("You can move to buy process from here!") }}>
              Buy
            </button>
          </div>
        )}

        {content.product_image && (
          <img
            src={content.product_image}
            alt={content.product_name}
            className="w-full h-auto mt-2 rounded-lg"
          />
        )}

        {/* Counter Offer Modal */}
        {isCounterOfferModalOpen && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-lg font-bold mb-4">Counter Offer</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700" htmlFor="counterPrice">
                  Counter Price
                </label>
                <input
                  type="number"
                  id="counterPrice"
                  className="mt-1 p-2 w-full border border-gray-300 rounded-md"
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  placeholder="Enter counter price"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700" htmlFor="counterDescription">
                  Counter Description
                </label>
                <textarea
                  id="counterDescription"
                  className="mt-1 p-2 w-full border border-gray-300 rounded-md"
                  value={counterDescription}
                  onChange={(e) => setCounterDescription(e.target.value)}
                  placeholder="Enter counter description"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="text-sm text-gray-500 hover:text-gray-700"
                  onClick={() => setIsCounterOfferModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="text-sm bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
                  onClick={handleCounterOffer}
                >
                  Submit Counter Offer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/3 bg-white shadow-md overflow-y-auto min-h-screen h-screen">
        <h2 className="text-lg font-bold p-4 border-b">Users ({currentUser?.data?._id} - {currentUser?.data?.email})</h2>
        {users.length === 0 ? (
          <p className="text-center p-4">No users found!</p>
        ) : (
          <ul className=''>
            {users.map((user) => (
              <li
                key={user.id}
                className={`p-4 cursor-pointer hover:bg-gray-100 ${selectedUser?.id === user.id ? 'bg-gray-200' : ''
                  }`}
                onClick={() => setSelectedUser(user)}
              >
                <h3 className="font-semibold">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chat Screen */}
      <div className="flex-1 flex flex-col bg-white h-screen">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold">{selectedUser.name}</h2>
              <p className="text-sm text-gray-600">{selectedUser.email}</p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-center text-gray-600">Start a conversation with {selectedUser.name}!</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded-lg max-w-sm ${(typeof message.sender === 'object' && message.sender._id === currentUser?.data?._id) ||
                        (message.sender === currentUser?.data?._id)
                        ? 'bg-blue-500 text-white self-end'
                        : 'bg-gray-200'
                        }`}
                    >
                      {typeof message.content === 'object' ? (
                        <OfferChatComponent content={message.content} messageKey={index} />
                      ) : (
                        <span>{message.content}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t flex items-center">
              <input
                type="text"
                className="flex-1 p-2 border rounded-lg"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
              />
              <button
                className="ml-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                onClick={handleSendMessage}
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-gray-600">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;