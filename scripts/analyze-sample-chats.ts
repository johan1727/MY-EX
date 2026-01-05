
import * as fs from 'fs';
import * as path from 'path';

// Mock types for standalone execution
interface Message {
    date: Date;
    sender: string;
    content: string;
}

// Simple regex parser for WhatsApp export format (DD/MM/YY, HH:MM AM/PM - Sender: Message)
const parseWhatsAppChat = (text: string): Message[] => {
    const lines = text.split('\n');
    const messages: Message[] = [];
    // Regex for: 6/1/23, 9:16 PM - Jhonatan: Que rollo
    const msgRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s(\d{1,2}:\d{2}\s?[AP]M)\s-\s([^:]+):\s(.+)$/;

    for (const line of lines) {
        const match = line.match(msgRegex);
        if (match) {
            try {
                const dateStr = match[1];
                const timeStr = match[2];
                const sender = match[3];
                const content = match[4];

                // Parse date loosely
                const dateParts = dateStr.split('/');
                const timeParts = timeStr.split(/[:\s]/); // split by colon or space
                let hours = parseInt(timeParts[0]);
                const minutes = parseInt(timeParts[1]);
                const ampm = timeParts[2];

                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;

                // Assuming MM/DD/YY based on sample
                const date = new Date(
                    2000 + parseInt(dateParts[2]), // Year
                    parseInt(dateParts[0]) - 1,   // Month
                    parseInt(dateParts[1]),       // Day
                    hours,
                    minutes
                );

                messages.push({ date, sender, content });
            } catch (e) {
                // Ignore parsing errors
            }
        }
    }
    return messages;
};

// Analysis Logic
async function analyzeChats() {
    const samplesDir = path.join(__dirname, '../sample-chats');
    const metadataPath = path.join(samplesDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
        console.error('Metadata not found');
        return;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    console.log('📊 STARTING CALIBRATION ANALYSIS\n');

    for (const filename of Object.keys(metadata)) {
        const filePath = path.join(samplesDir, filename);
        if (!fs.existsSync(filePath)) continue;

        const content = fs.readFileSync(filePath, 'utf-8');
        const info = metadata[filename];
        const messages = parseWhatsAppChat(content);

        console.log(`\n📂 Analyzing: ${filename} (${info.type.toUpperCase()})`);
        console.log(`   Participants: ${info.participants.user} & ${info.participants.other}`);
        console.log(`   Total Messages: ${messages.length}`);

        // 1. Analyze vocabulary differences
        const wordFreq: Record<string, number> = {};
        const emotionalKeywords = ['te quiero', 'te amo', 'extraño', 'beso', 'amor', 'cariño', 'linda', 'guapo'];
        const friendKeywords = ['wey', 'wei', 'nmms', 'pedo', 'jaja', 'haha', 'bro', 'pa', 'mai'];

        let emotionalCount = 0;
        let friendCount = 0;

        messages.forEach(m => {
            const text = m.content.toLowerCase();
            emotionalKeywords.forEach(k => { if (text.includes(k)) emotionalCount++; });
            friendKeywords.forEach(k => { if (text.includes(k)) friendCount++; });
        });

        console.log(`   ❤️ Emotional Words: ${emotionalCount}`);
        console.log(`   🤝 Friend/Slang Words: ${friendCount}`);

        const ratio = emotionalCount / (friendCount || 1);
        console.log(`   ⚖️ Ratio (Emo/Friend): ${ratio.toFixed(2)}`);

        // Suggest classification logic
        if (info.type === 'friend' || info.type === 'family') {
            if (friendCount > emotionalCount * 2) {
                console.log(`   ✅ VALID: Strongly fits 'Friend/Family' profile.`);
            } else {
                console.log(`   ⚠️ CHECK: Unusual high emotional content for ${info.type}.`);
            }
        } else if (info.type === 'ex-partner') {
            if (ratio > 0.1) {
                console.log(`   ✅ VALID: Fits 'Partner/Ex' profile.`);
            } else {
                console.log(`   ℹ️ NOTE: Low emotional content for Ex (maybe casual or breakup phase).`);
            }
        }
    }
}

analyzeChats();
