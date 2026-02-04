const fs = require('fs');

const wordsFile = 'c:/Users/c2500/OneDrive/Desktop/SecDa/js/words.js';

let content = fs.readFileSync(wordsFile, 'utf8');

const match = content.match(/const termList = \[\s*([\s\S]*?)\];/);

if (!match) {
    console.error("Could not find termList array");
    process.exit(1);
}

const arrayContent = match[1];

// Helper to clean and parse line
function parseLine(line) {
    line = line.trim();
    if (!line.startsWith('{') || !line.endsWith('},')) return null;

    // Extract JP
    const jpMatch = line.match(/jp:\s*"([^"]+)"/);
    if (!jpMatch) return null;
    const jp = jpMatch[1];

    // Extract EN (handle both en: and "en":)
    const enMatch = line.match(/(?:en|'en'|"en"):\s*"([^"]+)"/);
    if (!enMatch) return null;
    const enRaw = enMatch[1];

    // Convert to Title Case
    const enTitle = enRaw.charAt(0).toUpperCase() + enRaw.slice(1).toLowerCase();

    return { jp, en: enTitle };
}

const lines = arrayContent.trim().split('\n');
const parsed = [];

lines.forEach(line => {
    const obj = parseLine(line);
    if (obj) parsed.push(obj);
});

// Sort A-Z
parsed.sort((a, b) => a.en.localeCompare(b.en));

// Reconstruct
const newLines = parsed.map(p => `    { jp: "${p.jp}", en: "${p.en}" },`);
const newFileContent = `const termList = [\n${newLines.join('\n')}\n];\n\n`;

fs.writeFileSync(wordsFile, newFileContent, 'utf8');
console.log(`Processed and sorted ${parsed.length} words.`);
