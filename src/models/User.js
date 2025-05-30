const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  googleId: String,
  facebookId: String,
  username: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  googleLoginId: { type: String, nullable: true },
  facebookLoginId: { type: String, nullable: true },
  appleLoginId: { type: String, nullable: true },
  email: { type: String, required: true, unique: true },
  temp_email: { type: String },
  isEmailVerified: { type: Boolean, default: false },
  profile_pic: { type: String, default: '' },
  firstName: { type: String },
  lastName: { type: String },
  bio: { type: String, default: '' },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },
  coach: { type: mongoose.Schema.Types.ObjectId, ref: 'Coach' },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'], // Define allowed roles
    default: 'user' // Set default role to 'user'
  },
  otp: { type: String },
  resetToken: { type: String },
  customerID: { type: String },
  otpExpiry: { type: Date },
  birthDate: {
    type: Date,
    default: null,
  },
  resetTokenExpiry: { type: Date },
  walletBalance: { type: Number, default: 0 },
  cards: [
    {
      mollieCardId: String,
      addedAt: { type: Date, default: Date.now }
    }
  ],
  verificationLinkExpiryTime: { type: Date },
  staySignedIn: { type: Boolean, default: false },
  isOnBoardingComplete: { type: Boolean, default: false },
  firstTimeToddlerAddCompleted: { type: Boolean, default: false },
  privacyPolicyAccepted: { type: Boolean, default: false },
  termsAndConditionAccepted: { type: Boolean, default: false },
  signInTimestamp: { type: Date },
  incorrectAttempts: { type: Number, default: 0 },
  lastIncorrectNotificationAttempt: { type: Number, default: 0 },
  login_expired_till: { type: Date, default: null, nullable: true },
  permissions: { type: Object, nullable: true },
  created_by: { type: String },
  deleted_at: { type: Date, default: null, nullable: true },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Followers array
  phoneNumber: { type: String, required: false } // Mobile number field
});

const User = mongoose.model('User', userSchema);

module.exports = User;