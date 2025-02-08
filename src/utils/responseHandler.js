// const { logger } = require("../logger");
const { formatString } = require("./helper");

class CustomError extends Error {
  constructor(code, message, errors = null) {
    super(message);
    this.code = code;
    this.name = this.constructor.name;
    this.errors = errors; // Optional property for detailed field errors
  }
}

module.exports = CustomError;

class ResponseHandler {
  static success(res, data = null, code = 200, message="Response fetched sucessfuly!") {
    res.status(200).json({
      code: code,
      status: 'success',
      data,
      message: data?.message || data?.message !== undefined ? data.message : message
    });
  }
  static topicSuccess(res, data = null, code = 200, message="Response fetched sucessfuly!") {
    res.status(200).json({
      code: code,
      status: 'success',
      data,
      message: message
    });
  }
  static error(res, code, message, errors = []) {
    // Handle MongoDB duplicate key error
    if (code === 11000) {
      code = 500; // Change the status code for duplicate key errors
    }

    // If message is an object, extract the `message` property
    const responseMessage = typeof message === 'object' && message !== null
      ? message.message
      : message;

    // Send the error response
    res.status(code).json({
      status: 'error',
      code,
      message: responseMessage,
      data: {
        message: responseMessage,
      },
      errors,
    });
  }

  static restrict(res, code, message, errors = []) {
    res.status(code).json({
      status: 'restrict',
      code,
      message,
      errors,
    });
  }

  static validateRecaptcha(res, code, message, errors = []) {
    res.status(code).json({
      status: 'recaptcha-validate',
      code,
      message,
      errors,
    });
  }

  static notFound(res) {
    res.status(404).json({
      status: 'error',
      code: 404,
      message: 'API Route not found!',
    });
  }
}

class ErrorHandler {
  static handleError(err, res) {
    console.log(err.code, "SUSHIL")
    const { code = 500, message } = err;
    // logger.error(`${code} - ${message}`); // Log error message
    let errorMessage = message;
    if (err.code === 11000) {
      const duplicateKeyErrorMatch = err.message.match(/dup key: \{ (.*?): "(.*?)" \}/);
      if (duplicateKeyErrorMatch) {
        const duplicateField = duplicateKeyErrorMatch[1];
        const duplicateValue = duplicateKeyErrorMatch[2];
        // logger.error(`Duplicate key error: Field "${duplicateField}" with value "${duplicateValue}" already exists. Details: ${err.message}`);
        errorMessage = `Duplicate entry found for ${formatString(duplicateField)}`;
      }
    }
    ResponseHandler.error(res, code, errorMessage);
  }

  static handleNotFound(res) {
    ResponseHandler.notFound(res);
  }

  static handleDatabaseError(err, res) {
    if (err.code === 11000) {
      // Duplicate key error (MongoDB E11000)
      const field = Object.keys(err.keyPattern)[0];
      const value = err.keyValue[field];
      const errorMessage = `${field} "${value}" already exists`;

      // logger.error(`409 - ${errorMessage}`); // Log error message
      ResponseHandler.error(res, 409, 'Record exists with this value', [errorMessage]);
    } else {
      // Other database-related errors
      // logger.error(`500 - Database error: ${err.message}`); // Log error message
      ResponseHandler.error(res, 500, 'Database error');
    }
  }
}

module.exports = {
  CustomError,
  ErrorHandler,
  ResponseHandler,
};
