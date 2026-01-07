const API_KEY = 'AIzaSyD-pqbs2zLQWDoQGFtTxDTNNe8XT1qU7yc';

async function listModelNames() {
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        const data = await response.json();

        if (data.models) {
            console.log('Available Models:', data.models.map(m => m.name).join('\n'));
        } else {
            console.log('No models found or error:', data);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

listModelNames();
