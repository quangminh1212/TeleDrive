const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'teledrive.db');

// Create a database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database schema
function initDatabase() {
  db.serialize(() => {
    // Create files table
    db.run(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        mime_type TEXT,
        size INTEGER,
        telegram_file_id TEXT,
        telegram_message_id TEXT,
        telegram_chat_id TEXT,
        parent_folder TEXT,
        path TEXT,
        is_folder BOOLEAN DEFAULT 0,
        date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
        date_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tags table
    db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      )
    `);

    // Create file_tags table for many-to-many relationship
    db.run(`
      CREATE TABLE IF NOT EXISTS file_tags (
        file_id TEXT,
        tag_id INTEGER,
        PRIMARY KEY (file_id, tag_id),
        FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);
  });
}

module.exports = db; 