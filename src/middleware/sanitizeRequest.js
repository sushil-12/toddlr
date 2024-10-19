const xss = require('xss');

const sanitizeInput = (req, res, next) => {
    const sanitize = (obj) => {
        for (let key in obj) {
            if (typeof obj[key] === 'string') {
                obj[key] = xss(obj[key]);
            } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                sanitize(obj[key]);
            }
        }
    };

    // Sanitize the input in req.body, req.query, and req.params
    if (req.body) {
        sanitize(req.body);
    }
    if (req.query) {
        sanitize(req.query);
    }
    if (req.params) {
        sanitize(req.params);
    }

    next();
};

module.exports = sanitizeInput;
