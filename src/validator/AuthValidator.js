const validator = require('validator');
const { CustomError } = require('../utils/responseHandler');


class AuthValidator {
    static validateRegistration(body) {
        const { username, password, email, phoneNumber, id } = body;

        // Check if it's an update (with `id` present) or a new registration
        if (id) {
            // In case of update, password is not required
            if (!username || !email ) {
                throw new CustomError(400, 'All fields are required for update');
            }
        } else {
            // In case of new registration, password is required
            if (!username || !password || !email ) {
                throw new CustomError(400, 'All fields are required for registration');
            }

            // Password validation for new registration
            if (password.length < 8) {
                throw new CustomError(400, 'Password must be at least 8 characters long');
            }
        }

        // Validate email format
        if (!validator.isEmail(email)) {
            throw new CustomError(400, 'Invalid email format');
        }

        // Validate phone number format (optional: adjust regex based on your phone number requirements)
        // if (!validator.isMobilePhone(phoneNumber, 'any')) {
        //     throw new CustomError(400, 'Invalid phone number format');
        // }
    }

    static validateLogin(body) {
        const { username, password, phoneNumber, email } = body;

        // Check if a valid combination is provided
        if (!((username) || (phoneNumber) || (email))) {
            throw new CustomError(400, 'Username, phoneNumber, or email and password are required');
        }

        // Validate phone number if provided
        // if (phoneNumber && !validator.isMobilePhone(phoneNumber)) {
        //     throw new CustomError(400, 'Invalid phoneNumber format');
        // }

        // Validate email if provided
        if (email && !validator.isEmail(email)) {
            throw new CustomError(400, 'Invalid email format');
        }
    }
}

module.exports = AuthValidator;