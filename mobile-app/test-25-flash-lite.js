const API_KEY = 'AIzaSyD-pqbs2zLQWDoQGFtTxDTNNe8XT1qU7yc';

async function test25FlashLite() {
    try {
        console.log('Testing gemini-2.5-flash-lite...');
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`,
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
            console.log('✅ gemini-2.5-flash-lite Success');
        }
    } catch (error) {
        console.error('Network error:', error);
    }
}

test25FlashLite();
