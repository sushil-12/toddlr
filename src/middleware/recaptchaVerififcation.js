const fetch = require("node-fetch");
const { CustomError, ResponseHandler } = require("../utils/responseHandler");
const { HTTP_STATUS_CODES } = require("../constants/error_message_codes");

const recaptchaMiddleware = async (req, res, next) => {
  const RECAPTCHA_SERVER_KEY = process.env.RECAPTCHA_SECRET_KEY;
  const recaptcha_key = req.body.recaptcha_key;

  try {
    const response = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SERVER_KEY}&response=${recaptcha_key}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
      }
    );

    const data = await response.json();

    if (data.success !== true) {
      ResponseHandler.restrict(res, HTTP_STATUS_CODES.UNAUTHORIZED, { toast_error: true, toast_message:  "Captcha Validation Failed! Please try again.", message:  "Captcha Validation Failed! Please try again."}, HTTP_STATUS_CODES.FORBIDDEN);
      return;
    }

    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    ResponseHandler.restrict(res, HTTP_STATUS_CODES.UNAUTHORIZED, { toast_error: true, toast_message: `Error in Google Siteverify API. ${err.message}`, message: `Error in Google Siteverify API. ${err.message}` }, HTTP_STATUS_CODES.FORBIDDEN);
    return;
  }
};

module.exports = recaptchaMiddleware;
