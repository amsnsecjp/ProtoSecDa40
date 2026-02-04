const fs = require('fs');

const wordsFile = 'c:/Users/c2500/OneDrive/Desktop/SecDa/js/words.js';

let content = fs.readFileSync(wordsFile, 'utf8');

const match = content.match(/const termList = \[\s*([\s\S]*?)\];/);

if (!match) {
    console.error("Could not find termList array");
    process.exit(1);
}

const arrayContent = match[1];

// Parse lines into objects manually to preserve structure but allow sorting
const lines = arrayContent.trim().split('\n').filter(line => line.trim().startsWith('{') && line.trim().endsWith('},'));

const parsed = lines.map(line => {
    // Extract EN value for sorting
    const enMatch = line.match(/en:\s*"([^"]+)"/);
    const en = enMatch ? enMatch[1].toLowerCase() : "";
    return { line: line.trim(), en: en };
});

// Sort
parsed.sort((a, b) => a.en.localeCompare(b.en));

// Reconstruct
const newArrayContent = parsed.map(p => p.line).join('\n    ');

const newFileContent = `const termList = [\n    ${newArrayContent}\n];\n\n`;

fs.writeFileSync(wordsFile, newFileContent, 'utf8');
console.log("Words sorted alphabetically!");
