const API_KEY = 'AIzaSyD-pqbs2zLQWDoQGFtTxDTNNe8XT1qU7yc';

async function listModels() {
    try {
        console.log('Listing models with v1beta...');
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (!response.ok) {
            console.error('Error listing models:', data);
        } else {
            console.log('Available Models:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Network error:', error);
    }
}

listModels();
