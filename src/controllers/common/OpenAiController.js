const { OpenAI } = require('openai');
// const { ResponseHandler } = require('../../utils/responseHandler');

const { ResponseHandler, ErrorHandler, CustomError } = require("../../utils/responseHandler");

require('dotenv').config();

// OpenAI Configuration

const openai = new OpenAI({ key: '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' });

const askOpenAI = async (req, res) => {
  try {
    // Extract question from request body
    const { question } = req.body;

    // Validate required field
    if (!question) {
      return ResponseHandler.error(res, 'Question is required', 400);
    }

    // Query OpenAI API
    const openAIResponse = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: question }],
    });

    const aiAnswer = openAIResponse.data.choices[0].message.content;

    // Respond with the AI-generated answer
    return ResponseHandler.success(res, { aiAnswer }, 200, 'AI response retrieved successfully');
  } catch (error) {
    console.error('Error interacting with OpenAI:', error);
    ErrorHandler.handleError(error, res);
  }
};

module.exports = { askOpenAI };