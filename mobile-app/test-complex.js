const { GoogleGenerativeAI } = require("@google/generative-ai");

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyD-pqbs2zLQWDoQGFtTxDTNNe8XT1qU7yc';

async function testComplex20() {
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
        });

        console.log('Testing gemini-2.0-flash with config...');
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log('Response:', response.text());
        console.log('✅ Complex Test Success');
    } catch (error) {
        console.error('❌ Complex Test Error:', error);
    }
}

testComplex20();
