const { ErrorHandler, ResponseHandler } = require('../../utils/responseHandler');

const OpenAI = require ('openai')

// Initialize OpenAI
const openai = new OpenAI();

const answerChildQuestion = async (req, res) => {
    try {
       
        const { childProfile, question } = req.body;

        if (!childProfile || !question) {
            return ResponseHandler.error(res, null, 400, "Child profile and question are required");
        }

        // Compose prompt for OpenAI
        const prompt = `
            Based on the following child profile: 
            ${JSON.stringify(childProfile, null, 2)} 
            Answer the question: "${question}"
        `;

        // Call OpenAI API to generate the answer
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { "role": "system", "content": "You are an expert in child psychology and education." },
                { "role": "user", "content": prompt }
            ],
        });

        // Extract answer from OpenAI response
        const answer = completion.choices[0]?.message?.content || "No response generated.";

        // Respond with the answer
        return ResponseHandler.success(res, { answer }, 200, "Answer generated successfully");
    } catch (error) {
        console.error(error, "sushil");
        ErrorHandler.handleError(error, res);
    }
};

module.exports = {
    answerChildQuestion
};