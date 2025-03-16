const fs = require('fs');

// Read the file content
const lines = fs.readFileSync('index.js', 'utf8').split('\n');

// Fix specific lines with encoding issues
lines[3570] = "      return res.status(400).send('Link chia sẻ đã hết hạn');";

// Write the fixed content back to the file
fs.writeFileSync('index.js', lines.join('\n'), 'utf8');
console.log('Fixed line 3571'); 