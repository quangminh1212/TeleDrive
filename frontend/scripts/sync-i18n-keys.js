/**
 * Script to sync i18n keys across all language files
 * Uses English as the reference and adds missing keys to other languages
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localesDir = path.join(__dirname, '..', 'src', 'i18n', 'locales');

// Read English as the reference
const engPath = path.join(localesDir, 'eng.json');
const engContent = JSON.parse(fs.readFileSync(engPath, 'utf8'));

// Get all locale files
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'eng.json');

console.log(`Found ${localeFiles.length} language files to sync`);
console.log('Reference: eng.json\n');

let totalUpdated = 0;

localeFiles.forEach(file => {
    const filePath = path.join(localesDir, file);
    let content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let updated = false;
    let addedKeys = [];

    // Deep merge function - adds missing keys from reference
    function syncKeys(ref, target, prefix = '') {
        for (const key in ref) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (typeof ref[key] === 'object' && !Array.isArray(ref[key])) {
                if (!target[key]) {
                    target[key] = {};
                }
                syncKeys(ref[key], target[key], fullKey);
            } else {
                if (!(key in target)) {
                    // Add missing key with English value as fallback
                    target[key] = ref[key];
                    addedKeys.push(fullKey);
                    updated = true;
                }
            }
        }
    }

    syncKeys(engContent, content);

    if (updated) {
        // Write back with proper formatting
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n', 'utf8');
        console.log(`✓ ${file}: Added ${addedKeys.length} keys`);
        if (addedKeys.length <= 10) {
            addedKeys.forEach(k => console.log(`    + ${k}`));
        } else {
            console.log(`    (${addedKeys.slice(0, 5).join(', ')}... and ${addedKeys.length - 5} more)`);
        }
        totalUpdated++;
    } else {
        console.log(`○ ${file}: Already in sync`);
    }
});

console.log(`\n✅ Done! Updated ${totalUpdated} files.`);
