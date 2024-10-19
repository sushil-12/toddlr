const { logger } = require("../logger");
const { formatString } = require("./helper");

class CustomError extends Error {
  constructor(statusCode, message, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    this.errors = errors; // Optional property for detailed field errors
  }
}

module.exports = CustomError;

class ResponseHandler {
  static success(res, data = null, code = 200) {
    res.status(200).json({
      code: code,
      status: 'success',
      data,
    });
  }

  static error(res, statusCode, message, errors = []) {
    res.status(statusCode).json({
      status: 'error',
      statusCode,
      message,
      errors,
    });
  }

  static restrict(res, statusCode, message, errors = []) {
    res.status(statusCode).json({
      status: 'restrict',
      statusCode,
      message,
      errors,
    });
  }

  static validateRecaptcha(res, statusCode, message, errors = []) {
    res.status(statusCode).json({
      status: 'recaptcha-validate',
      statusCode,
      message,
      errors,
    });
  }

  static notFound(res) {
    res.status(404).json({
      status: 'error',
      statusCode: 404,
      message: 'API Route not found!',
    });
  }
}

class ErrorHandler {
  static handleError(err, res) {
    const { statusCode = 500, message } = err;
    logger.error(`${statusCode} - ${message}`); // Log error message
    let errorMessage = message;
    if (err.code === 11000) {
      const duplicateKeyErrorMatch = err.message.match(/dup key: \{ (.*?): "(.*?)" \}/);
      if (duplicateKeyErrorMatch) {
        const duplicateField = duplicateKeyErrorMatch[1];
        const duplicateValue = duplicateKeyErrorMatch[2];
        logger.error(`Duplicate key error: Field "${duplicateField}" with value "${duplicateValue}" already exists. Details: ${err.message}`);
        errorMessage = `Duplicate entry found for ${formatString(duplicateField)}`;
      }
    }
    ResponseHandler.error(res, statusCode, errorMessage);
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

      logger.error(`409 - ${errorMessage}`); // Log error message
      ResponseHandler.error(res, 409, 'Record exists with this value', [errorMessage]);
    } else {
      // Other database-related errors
      logger.error(`500 - Database error: ${err.message}`); // Log error message
      ResponseHandler.error(res, 500, 'Database error');
    }
  }
}

module.exports = {
  CustomError,
  ErrorHandler,
  ResponseHandler,
};
