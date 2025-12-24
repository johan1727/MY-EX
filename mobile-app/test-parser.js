// Test script to verify WhatsApp regex parsing
// Run with: node test-parser.js

const testLines = [
    "11/23/23, 11:02 PM - Messages and calls are end-to-end encrypted. Only people in this chat can read",
    "11/23/23, 11:02 PM - Marian: Hola",
    "11/23/23, 11:03 PM - You: Hola! Como estas?",
    "01/15/2024, 10:30 AM - John: Test with 4-digit year",
    "01/15/2024, 22:30 - Jane: Test 24-hour format"
];

// Updated regex that supports 2 or 4 digit years and optional AM/PM
const whatsappRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4},\s\d{1,2}:\d{2}(?:\s(?:AM|PM))?)\s-\s([^:]+):\s(.+)$/;

console.log("Testing WhatsApp Parser Regex\n");
console.log("=".repeat(80));

testLines.forEach((line, index) => {
    const match = line.match(whatsappRegex);

    if (match) {
        const [, timestamp, sender, content] = match;
        console.log(`\n✅ Line ${index + 1} MATCHED:`);
        console.log(`   Timestamp: ${timestamp}`);
        console.log(`   Sender: ${sender}`);
        console.log(`   Content: ${content.substring(0, 50)}...`);
    } else {
        console.log(`\n❌ Line ${index + 1} NO MATCH:`);
        console.log(`   ${line}`);
    }
});

console.log("\n" + "=".repeat(80));
console.log("\nIf you see ✅ for your WhatsApp format, the regex is working!");
console.log("If you see ❌, please share the exact format of your messages.");
