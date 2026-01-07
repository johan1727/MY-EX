// Test Gemini API Key with correct model
const API_KEY = 'AIzaSyD-pqbs2zLQWDoQGFtTxDTNNe8XT1qU7yc';

async function testGeminiAPI() {
    try {
        // Using v1 API with gemini-pro model
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: 'Say hello' }]
                    }]
                })
            }
        );

        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.error('❌ ERROR:', data);
        } else {
            console.log('✅ API Key funciona correctamente con gemini-pro');
        }
    } catch (error) {
        console.error('Connection error:', error);
    }
}

testGeminiAPI();
