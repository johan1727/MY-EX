const API_KEY = 'AIzaSyD-pqbs2zLQWDoQGFtTxDTNNe8XT1qU7yc';

async function testLatest() {
    try {
        console.log('Testing gemini-flash-latest...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Hello' }] }] })
            }
        );
        const data = await response.json();
        console.log('Status:', response.status);
        if (!response.ok) {
            console.error('Error:', JSON.stringify(data, null, 2));
        } else {
            console.log('✅ gemini-flash-latest Success');
        }
    } catch (error) {
        console.error('Network error:', error);
    }
}

testLatest();
