const API_KEY = 'AIzaSyD-pqbs2zLQWDoQGFtTxDTNNe8XT1qU7yc';

async function testWithRealSDK() {
    try {
        const { GoogleGenerativeAI } = require("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(API_KEY);

        console.log('Testing with real SDK (like emulator)...');
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent("Say hello");
        const response = await result.response;
        console.log('Response:', response.text());
        console.log('✅ SDK Test Success');
    } catch (error) {
        console.error('❌ SDK Test Failed:', error.message || error);
    }
}

testWithRealSDK();
