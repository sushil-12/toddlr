const recaptchaMiddleware = require("./recaptchaVerififcation");

const checkFormTypeMiddleware = (req, res, next) => {
  if (req.body.form_type !== "verify_account_form" && req.body.form_type !== "forgot_password_form" && req.body.form_type !== "reset_password_form") {
    return recaptchaMiddleware(req, res, next);
  }
  next();
};

module.exports = checkFormTypeMiddleware;