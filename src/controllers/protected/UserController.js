const jwt = require('jsonwebtoken');
const fs = require('fs');
const handlebars = require('handlebars');
const { Readable } = require('stream');
const User = require('../../models/User');
const { CustomError, ErrorHandler, ResponseHandler } = require('../../utils/responseHandler');
const Permission = require('../../models/Permission');
const Role = require('../../models/Role');
const bcrypt = require('bcrypt');
const { HTTP_STATUS_CODES } = require('../../constants/error_message_codes');
const sendMail = require('../../utils/sendMail');
const { generateRandomString } = require('../auth/authController');
const path = require('path');
const Sidebar = require('../../models/Sidebar');
const AuthValidator = require('../../validator/AuthValidator');
const cloudinary = require('../../config/cloudinary');
const Website = require('../../models/Websites');
const Coach = require('../../models/Coach');
const Chat = require('../../models/Chat');
const Order = require('../../models/Order');
const Toddler = require('../../models/Toddler');
const Address = require('../../models/Address');
const TokenBlackList = require('../../models/TokenBlackList');


const defaultSidebarJson = {
  "comman": [
    {
      "id": "7dg9i97e9",
      "imgURL": "dashboard",
      "route": "/dashboard",
      "label": "Dashboard",
      "subcategory": []
    },
  ],
  "websites": {
  }
}

const getUserRepository = async (userId) => {
  const user = await User.findById(userId);
  if (user) {
    const userProfile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      bio: user.bio || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque a erat ac ipsum sagittis elementum',
      profile_pic: user.profile_pic,
      lastName: user.lastName,
      role: user.role?.name,
      permissions: user.permissions,
      isEmailVerified: user?.isEmailVerified,
      isOnBoardingComplete: user?.isOnBoardingComplete,
      firstTimeToddlerAddCompleted: user?.firstTimeToddlerAddCompleted,
      temp_email: user?.temp_email,
      followers: user?.followers?.length || '44+',
      rating: user?.rating || '4.5'
    };

    return userProfile;
  }
  return null;

};

const getUsersProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).populate('role').populate('permissions');
    if (!user) {
      throw new CustomError(404, 'User not found');
    }


    const userProfile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      bio: user.bio,
      profile_pic: user.profile_pic,
      lastName: user.lastName,
      role: user.role?.name,
      permissions: user.permissions,
      isEmailVerified: user?.isEmailVerified,
      isOnBoardingComplete: user?.isOnBoardingComplete,
      firstTimeToddlerAddCompleted: user?.firstTimeToddlerAddCompleted,
      temp_email: user?.temp_email,
      followers: user?.followers

    };

    ResponseHandler.success(res, userProfile, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const getRecentOrders = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const orders = await Order.find({ createdBy: userId }).sort({ createdAt: -1 });

    if (!orders || orders.length === 0) {
      return ResponseHandler.success(res, [], 200);
    }

    ResponseHandler.success(res, orders, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};


const updateOrderReview = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { receivedInGoodCondition, orderRating, orderReview } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      throw new CustomError(404, 'Order not found');
    }
    if (order.status !== 'Delivered') {
      throw new CustomError(400, 'Order is not delivered yet');
    }
    if (order.orderReviewDone) {
      throw new CustomError(400, 'Order review already done');
    }


    order.receivedInGoodCondition = receivedInGoodCondition;
    order.orderRating = orderRating;
    order.orderReviewDone = true;
    order.orderReview = orderReview;

    await order.save();

    ResponseHandler.success(res, { message: 'Order review updated successfully' }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const getProfile = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const user = await User.findById(userId).populate('role').populate('permissions');
    if (!user) {
      throw new CustomError(404, 'User not found');
    }

    const toddlers = await Toddler.find({ parentId: user._id });
    const userProfile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      bio: user.bio,
      gender: user.gender,
      birthDate: user.birthDate || null,
      profile_pic: user.profile_pic,
      lastName: user.lastName,
      role: user.role?.name,
      permissions: user.permissions,
      isEmailVerified: user?.isEmailVerified,
      isOnBoardingComplete: user?.isOnBoardingComplete,
      firstTimeToddlerAddCompleted: user?.firstTimeToddlerAddCompleted,
      temp_email: user?.temp_email,
      followers: user?.followers,
      toddlers

    };
    console.log("USER TEMP EMAIL", user?.temp_email)

    ResponseHandler.success(res, userProfile, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const createChatWithCoach = async (req, res) => {
  const token = req.headers.authorization.split(' ')[1];
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  const userId = decodedToken.userId;

  try {
    // Retrieve the logged-in user's data and check for an associated coach
    const user = await User.findById(userId).populate('coach'); // Assuming the 'coach' field exists on the user model

    if (!user) {
      throw new CustomError(404, 'User not found');
    }

    let coachId = user.coach ? user.coach._id : null; // If a coach is assigned, get their ID

    // If no coach assigned, create a new coach and associate with the user
    const uniqueCoachName = `Coach_${userId}_${Date.now()}`; // Generate a unique coach name

    const newCoach = new Coach({
      coachName: uniqueCoachName,
      userId: userId,
      isActive: true,
    });

    const savedCoach = await newCoach.save();
    coachId = savedCoach._id;

    // Update the user document with the new coach ID
    await User.findByIdAndUpdate(
      userId,
      { coach: coachId }, // Update the 'coach' field with the coachId
      { new: true } // Return the updated document
    ).populate('coach');


    const participants = [userId, coachId]; // Set participants to user and coach
    console.log("coachId ID", coachId);

    if (participants.length !== 2) {
      throw new CustomError(400, 'Exactly two participants are required');
    }

    // Check if chat already exists with these participants
    let chat = await Chat.findOne({ participants: { $all: participants } });

    if (!chat) {
      // If no chat exists, create a new chat with the participants
      const initialMessage = {
        sender: coachId,
        content: "Hello, How may I help you?", // Initial message from the coach
        timestamp: new Date(),
      };

      chat = await Chat.create({
        participants,
        messages: [initialMessage], // Include the initial message in the chat
      });
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
              error: 'Failed to fetch offer details',
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

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const user = await User.findById(userId);

    if (!user) {
      throw new CustomError(404, 'User not found');
    }

    user.staySignedIn = false;
    await user.save();

    // Add token to tokenBlackList
    const tokenBlackList = new TokenBlackList({ token });
    await tokenBlackList.save();

    ResponseHandler.success(res, { message: 'Logged out successfully' }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const sendOtpVerificationOnEmail = async (req, res) => {
  try {
    const { email, form_type, verification_code } = req.body;
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError(404, 'User not found');
    }

    // Generate OTP here
    const otp = generateRandomString(6); // You need to implement generateOTP function

    if (form_type == 'send_mail') {
      const userEXIST = await User.findOne({ email: email }).exec();

      if (userEXIST) {
        ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'verification_code', message: "It looks like this email is already taken" }, HTTP_STATUS_CODES.UNAUTHORIZED); return;
      }

      try {
        const templateFilePath = path.join(__dirname, '..', '..', 'email-templates', 'send-email-verification.hbs');
        const templateFile = fs.readFileSync(templateFilePath, 'utf8');
        const template = handlebars.compile(templateFile);
        const app_logo = `${process.env.APP_LOGO_PATH}`
        const app_name = process.env.APP_NAME;
        const verificationLink = `${process.env.FRONTEND_APP_URL}verify-email/${encodeURIComponent(otp)}/${encodeURIComponent(user._id)}/${btoa(email)}`;
        const verificationLinkExpiryTime = user.otpExpiry = new Date(Date.now() + parseInt(process.env.VERIFICATION_LINK_EXPIRY_TIME));


        const mailOptions = {
          from: `"${app_name}" <${process.env.EMAIL_FROM}>`,
          to: email,
          subject: 'Email reset',
          html: template({ app_logo, app_name, verificationLink })
        };

        user.otp = otp;
        user.otpExpiry = new Date(Date.now() + parseInt(process.env.OTP_EXPIRY_DURATION));
        user.isEmailVerified = false;
        user.temp_email = email;
        user.verificationLinkExpiryTime = verificationLinkExpiryTime;
        await user.save();

        // Send email
        sendMail(mailOptions)
          .then(async () => {
            ResponseHandler.success(res, { email_sent: true, otp: otp, message: "Verification code sent successfully" }, HTTP_STATUS_CODES.OK);
          })
          .catch((error) => {
            ResponseHandler.error(res, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, { field_error: 'email', email_sent: false, message: "Failed to send verification code" }, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
          });
      } catch (error) {
        ErrorHandler.handleError(error, res);
      }
    } else {
      if (verification_code !== user.otp) {
        ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'verification_code', message: "Wrong Code" }, HTTP_STATUS_CODES.UNAUTHORIZED); return;
      } else {
        user.otp = otp;
        user.save();
        ResponseHandler.success(res, { verified: true, message: "Email verified successfully" }, HTTP_STATUS_CODES.OK);
      }
    }

  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const checkPassword = async (req, res) => {
  try {
    const { password } = req.body; // Assuming the password is sent in the request body

    // Extracting the token from the request headers
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError(404, 'User not found');
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      ResponseHandler.error(res, HTTP_STATUS_CODES.UNAUTHORIZED, { field_error: 'password', message: "Your password seems incorrect! Please try again." }, HTTP_STATUS_CODES.UNAUTHORIZED); return;
    }

    // If passwords match, return a success response
    ResponseHandler.success(res, { message: 'Password is correct' }, 200);
  } catch (error) {
    // Handle errors
    ErrorHandler.handleError(error, res);
  }
};

const saveSidebarData = async (req, res) => {
  try {
    const jsonData = req.body;
    const jsonString = JSON.stringify(jsonData, null, 2);
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Check if a sidebar with the same userId exists
    const existingSidebar = await Sidebar.findOne({ userId });

    if (existingSidebar) {
      // If sidebar with same userId exists, update its items
      existingSidebar.items = jsonString;
      await existingSidebar.save();

      ResponseHandler.success(res, { message: 'Sidebar Updated Successfully', sidebar: JSON.parse(existingSidebar.items[0]) }, HTTP_STATUS_CODES.OK);
    } else {
      // If sidebar with userId doesn't exist, create a new sidebar object
      const sidebar = new Sidebar({
        userId: userId,
        items: jsonString
      });

      // Save the Sidebar object to the database
      await sidebar.save();

      ResponseHandler.success(res, { message: 'Sidebar Created Successfully', sidebar: JSON.parse(sidebar.items[0]) }, HTTP_STATUS_CODES.CREATED);
    }
  } catch (error) {
    ResponseHandler.error(res, HTTP_STATUS_CODES.BAD_REQUEST, error.message, HTTP_STATUS_CODES.BAD_REQUEST);
  }
};


const getSidebarData = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;
    let sidebar = await Sidebar.findOne({ userId });
    if (sidebar == null || sidebar == '') {
      sidebar = defaultSidebarJson;
    }

    ResponseHandler.success(res, { sidebar }, HTTP_STATUS_CODES.OK);
  } catch (error) {
    // Handle errors
    console.error('Error fetching sidebar data:', error);
    ResponseHandler.error(res, HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR, 'Internal server error', HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR);
  }
};


const cancelEmailChangeRequest = async (req, res) => {
  try {

    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError(404, 'User not found');
    }

    user.isEmailVerified = true;
    user.temp_email = '';
    await user.save();
    // If passwords match, return a success response
    ResponseHandler.success(res, { message: 'Email Change request has been cancelled successfully!' }, 200);
  } catch (error) {
    // Handle errors
    ErrorHandler.handleError(error, res);
  }
};


const createOrEditUser = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const created_by = decodedToken.userId;

    AuthValidator.validateRegistration(req.body);
    const { username, password, email, firstName, lastName, id, profile_pic, permissions, user_type } = req.body;
    const userRole = await Role.findOne({ name: user_type });
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }


    if (id) {
      // Edit user if id is provided
      const existingUser = await User.findById(id);
      if (!existingUser) {
        return ResponseHandler.error(res, { message: 'User not found' }, HTTP_STATUS_CODES.NOT_FOUND);
      }
      // Update the user fields
      existingUser.username = username;
      if (hashedPassword) existingUser.password = hashedPassword;
      existingUser.email = email;
      existingUser.firstName = firstName;
      existingUser.lastName = lastName;
      existingUser.role = userRole;
      existingUser.temp_email = '';
      existingUser.permissions = permissions;
      if (Object.entries(permissions).length === 0) {
        existingUser.permissions = null;
      }
      if (profile_pic == '') {
        existingUser.profile_pic = profile_pic;
      }

      if (profile_pic) {
        const base64String = profile_pic;
        const buffer = Buffer.from(base64String, 'base64');
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);

        // Upload the profile picture to cloudinary
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({ folder: 'profile_pictures' },
            (error, result) => {
              if (error) {
                console.error('Upload error:', error);
                reject(error);
              } else {
                existingUser.profile_pic = result.secure_url;
                console.log('Uploaded profile pic:', result.secure_url);
                resolve();
              }
            }
          );

          readableStream.pipe(uploadStream);
        });

        await uploadPromise;
      }

      await existingUser.save();
      ResponseHandler.success(res, { message: 'User updated successfully' }, HTTP_STATUS_CODES.OK);
    } else {
      const duplicateUser = await User.findOne({
        $or: [{ username }, { email }],
      });

      if (duplicateUser) {
        let conflictField = '';

        if (duplicateUser.username === username) {
          conflictField = 'Username';
        } else if (duplicateUser.email === email) {
          conflictField = 'Email';
        }
        return ResponseHandler.error(res, HTTP_STATUS_CODES.CONFLICT, `${conflictField} already exists`, HTTP_STATUS_CODES.CONFLICT);
      }
      const newUser = new User({
        username,
        password: hashedPassword,
        email,
        firstName,
        lastName,
        permissions,
        isEmailVerified: true,
        temp_email: '',
        role: userRole,
        created_by
      });

      // Save the user
      await newUser.save();

      // Handle profile picture upload
      if (profile_pic) {
        const base64String = profile_pic;
        const buffer = Buffer.from(base64String, 'base64');
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);

        // Upload the profile picture to cloudinary
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream({ folder: 'profile_pictures' },
            (error, result) => {
              if (error) {
                console.error('Upload error:', error);
                reject(error);
              } else {
                if (id) {

                }
                newUser.profile_pic = result.secure_url;
                console.log('Uploaded profile pic:', result.secure_url);
                resolve();
              }
            }
          );

          readableStream.pipe(uploadStream);
        });

        await uploadPromise;
        await newUser.save(); // Save the user with the updated profile picture
      }

      ResponseHandler.success(res, { message: 'User created successfully' }, HTTP_STATUS_CODES.OK);
    }
  } catch (error) {
    // Handle errors
    ErrorHandler.handleError(error, res);
  }
};

const editUserProfile = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    // Extract fields from the request body
    const { username, email, firstName, lastName, bio, profile_pic, temp_email, isOnBoardingComplete, birthDate, gender } = req.body;

    console.log("I am called", req.body);

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError(404, 'User not found');
    }

    // Update fields only if they are provided in the request
    if (username) user.username = username;
    if (email) user.email = email;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (bio) user.bio = bio;
    if (profile_pic) user.profile_pic = profile_pic;
    if (temp_email) user.temp_email = temp_email;
    if (birthDate) user.birthDate = birthDate;
    if (gender) user.gender = gender;
    if (isOnBoardingComplete) user.isOnBoardingComplete = isOnBoardingComplete;


    // Save the updated user
    await user.save();

    // Response with updated profile information
    // const updatedUserProfile = {
    //   id: user._id,
    //   username: user.username,
    //   isOnBoardingComplete: user.isOnBoardingComplete,
    //   email: user.email,
    //   firstName: user.firstName,
    //   lastName: user.lastName,
    //   bio: user.bio,
    //   profile_pic: user.profile_pic,
    //   temp_email: user.temp_email,
    //   role: user.role?.name,
    //   permissions: user?.permissions,
    //   isEmailVerified: user?.isEmailVerified,
    // };

    const toddlers = await Toddler.find({ parentId: user._id });
    const updatedUserProfile = {
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      bio: user.bio,
      gender,
      profile_pic: user.profile_pic,
      lastName: user.lastName,
      role: user.role?.name,
      permissions: user.permissions,
      isEmailVerified: user?.isEmailVerified,
      isOnBoardingComplete: user?.isOnBoardingComplete,
      firstTimeToddlerAddCompleted: user?.firstTimeToddlerAddCompleted,
      temp_email: user?.temp_email,
      followers: user?.followers,
      toddlers

    };
    console.log("USER TEMP updatedUserProfile",updatedUserProfile)

    ResponseHandler.success(res, updatedUserProfile, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};


const getUserProfile = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = req.params.user_id;
    const user = await User.findById(userId).populate('role');
    if (!user) {
      throw new CustomError(404, 'User not found');
    }

    const userProfile = await getUserRepository(userId);
    ResponseHandler.success(res, userProfile, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const getAllUser = async (req, res) => {
  try {
    // Extract and parse query parameters
    const { page = 1, limit = 20, search } = req.query;

    // Build the search query
    const query = {
      deleted_at: null, // Exclude deleted users
    };

    // If search is provided, add username search criteria
    if (search) {
      query.username = { $regex: new RegExp(search, 'i') }; // Case-insensitive search for username
    }

    // Convert page and limit to numbers and ensure they are valid
    const pageNumber = Math.max(Number(page), 1); // Page must be 1 or greater
    const limitNumber = Math.max(Number(limit), 1); // Limit must be 1 or greater

    // Fetch users with pagination and search query
    const users = await User.find(query)
      .skip((pageNumber - 1) * limitNumber) // Skip based on page
      .populate('role') // Populate role field
      .limit(limitNumber); // Limit results based on page size

    // Total documents matching the query
    const totalDocuments = await User.countDocuments(query);
    const totalPages = Math.ceil(totalDocuments / limitNumber);

    // Fetch all websites and create a lookup for website info
    const websites = await Website.find().select('icon business_name');
    const websitesData = websites.map(website => ({
      id: website._id,
      ...website._doc, // Spread the remaining fields from the document
    }));

    // Helper function to get website icon or name
    const getWebsiteNameAndIcon = (websiteId, findWhat) => {
      const website = websitesData.find(site => site.id.toString() === websiteId.toString());
      if (!website) return null;
      return findWhat === 'icon' ? website.icon : website.business_name;
    };

    // Map user data with permissions and website details
    const userData = users.map(user => {
      let permissions = user.permissions || {};
      if (user.role !== 'admin') {
        if (permissions && Object.keys(permissions).length > 0) {
          Object.keys(permissions).forEach(key => {
            const permissionObject = permissions[key];
            const websiteName = getWebsiteNameAndIcon(key, 'business_name');
            const websiteIcon = getWebsiteNameAndIcon(key, 'icon');

            if (websiteName && websiteIcon) {
              permissions[key] = {
                ...permissionObject,
                name: websiteName,
                icon: websiteIcon
              };
            } else {
              delete permissions[key];
            }
          });
        } else {
          permissions = {};
        }
      } else {
        permissions = null;
      }

      return {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        bio: user.bio,
        profile_pic: user.profile_pic,
        lastName: user.lastName,
        role: user?.role?.name,
        permissions: permissions,
        isEmailVerified: user?.isEmailVerified,
        temp_email: user?.temp_email
      };
    });

    // Pagination information
    const paginationInfo = {
      page: pageNumber,
      limit: limitNumber,
      totalPages,
      totalItems: totalDocuments,
    };

    // Send success response
    ResponseHandler.success(res, { userData, pagination: paginationInfo }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const deleteUser = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const user_id = req.params.user_id;

    // Find the user by ID and delete it
    // const deletedUser = await User.findByIdAndDelete(user_id);
    const deletedUser = await User.findByIdAndUpdate(user_id, { deleted_at: Date.now() });
    if (!deletedUser) {
      throw new CustomError(404, 'User not found');
    }

    // Respond with success message
    ResponseHandler.success(res, { message: 'User deleted successfully' }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
}

const addOrEditUserAddress = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const { addressId, title, street, number, zipCode, city, country } = req.body;

    let address;
    if (addressId) {
      // Edit existing address
      address = await Address.findOne({ _id: addressId, userId });
      if (!address) {
        throw new CustomError(404, 'Address not found');
      }

      address.title = title;
      address.street = street;
      address.number = number;
      address.zipCode = zipCode;
      address.city = city;
      address.country = country;

      await address.save();
      ResponseHandler.success(res, { message: 'Address updated successfully', address }, 200);
    } else {
      // Add new address
      const newAddress = new Address({
        userId,
        title,
        street,
        number,
        zipCode,
        city,
        country
      });

      await newAddress.save();
      ResponseHandler.success(res, { message: 'Address added successfully', address: newAddress }, 201);
    }
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const getAddressList = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const addresses = await Address.find({ userId });

    if (!addresses || addresses.length === 0) {
      return ResponseHandler.success(res, [], 200);
    }

    ResponseHandler.success(res, addresses, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const setPrimaryAddress = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;
    const { addressId } = req.params;
    console.log(addressId);

    const address = await Address.findOne({ _id: addressId, userId });
    if (!address) {
      throw new CustomError(404, 'Address not found');
    }

    // Set all other addresses of the user to not primary
    await Address.updateMany({ userId, _id: { $ne: addressId } }, { isPrimary: false });

    // Set the selected address as primary
    address.isPrimary = true;
    await address.save();

    ResponseHandler.success(res, { message: 'Primary address set successfully', address }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};


const softDeleteAccount = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;

    const user = await User.findById(userId);
    if (!user) {
      throw new CustomError(404, 'User not found');
    }

    user.deleted_at = Date.now();
    await user.save();
    // Add token to tokenBlackList
    const tokenBlackList = new TokenBlackList({ token });
    await tokenBlackList.save();

    ResponseHandler.success(res, { message: 'Account deleted successfully' }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

const deleteAddress = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decodedToken.userId;
    const { addressId } = req.params;

    // Validate addressId
    if (!addressId) {
      throw new CustomError(400, 'Address ID is required');
    }

    // Find and delete the address
    const deletedAddress = await Address.findOneAndDelete({ _id: addressId, userId });
    
    if (!deletedAddress) {
      throw new CustomError(404, 'Address not found');
    }

    // Return a consistent response structure
    ResponseHandler.success(res, { 
      success: true,
      message: 'Address deleted successfully',
      data: {
        addressId: deletedAddress._id,
        deletedAt: new Date()
      }
    }, 200);
  } catch (error) {
    ErrorHandler.handleError(error, res);
  }
};

module.exports = {
  getProfile, getUsersProfile, getRecentOrders, updateOrderReview, getUserRepository, editUserProfile, checkPassword, createChatWithCoach, addOrEditUserAddress, sendOtpVerificationOnEmail, logout, getSidebarData, saveSidebarData, cancelEmailChangeRequest, createOrEditUser, getUserProfile, getAllUser, deleteUser, getAddressList, setPrimaryAddress, softDeleteAccount, deleteAddress
};
