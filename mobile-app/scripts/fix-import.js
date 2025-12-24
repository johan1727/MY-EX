// Temporary fix script to update import.tsx
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'app', 'tools', 'ex-simulator', 'import.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the specific setStep('upload') in the web upload callback
const searchPattern = /setParsedMessages\(finalMessages\);\s*\/\/ Go back to upload screen to show name input and analyze button\s*setStep\('upload'\);/;

const replacement = `setParsedMessages(finalMessages);
                        
                        // Show alert and reload page to update UI
                        Alert.alert(
                            '✅ Listo!',
                            \`\${finalMessages.length.toLocaleString()} mensajes procesados.\\n\\nAhora ingresa el nombre de tu ex y presiona Analizar.\`,
                            [{ text: 'OK', onPress: () => window.location.reload() }]
                        );`;

if (searchPattern.test(content)) {
    content = content.replace(searchPattern, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ File updated successfully!');
} else {
    console.log('❌ Pattern not found in file');
    console.log('Searching for simpler pattern...');

    // Try simpler pattern
    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('Go back to upload screen') && i + 1 < lines.length && lines[i + 1].includes("setStep('upload')")) {
            console.log(`Found at line ${i + 1}`);
            found = true;
            break;
        }
    }

    if (!found) {
        console.log('Pattern still not found. Manual edit required.');
    }
}
