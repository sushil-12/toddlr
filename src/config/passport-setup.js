require('dotenv').config();
const User = require('../models/User');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const passport = require('passport');
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if the user already exists in the database
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          // If not, create a new user
          user = await new User({
            googleId: profile.id,
            email: profile.emails[0].value,
            username: profile.displayName,
          }).save();
        }
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

// Facebook OAuth strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: '/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if the user already exists
        let user = await User.findOne({ facebookId: profile.id });
        if (!user) {
          // If not, create a new user
          user = await new User({
            facebookId: profile.id,
            email: profile.emails[0].value,
            username: `${profile.name.givenName} ${profile.name.familyName}`,
          }).save();
        }
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);