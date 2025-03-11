const db = require('../config/database');
const shortid = require('shortid');
const path = require('path');

class File {
  // Create a new file record
  static create(fileData) {
    return new Promise((resolve, reject) => {
      const id = fileData.id || shortid.generate();
      const { 
        name, 
        mime_type, 
        size, 
        telegram_file_id, 
        telegram_message_id, 
        telegram_chat_id,
        parent_folder,
        is_folder = 0
      } = fileData;

      // Calculate the path based on parent folder
      let filePath = name;
      if (parent_folder) {
        // Get parent folder path
        db.get('SELECT path FROM files WHERE id = ?', [parent_folder], (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row) {
            filePath = path.join(row.path, name);
          }
          
          insertFile();
        });
      } else {
        insertFile();
      }

      function insertFile() {
        const stmt = db.prepare(`
          INSERT INTO files (
            id, name, mime_type, size, telegram_file_id, 
            telegram_message_id, telegram_chat_id, parent_folder, 
            path, is_folder
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          id, name, mime_type, size, telegram_file_id,
          telegram_message_id, telegram_chat_id, parent_folder,
          filePath, is_folder,
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            resolve({ id, ...fileData, path: filePath });
          }
        );

        stmt.finalize();
      }
    });
  }

  // Get a file by ID
  static getById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM files WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(row);
      });
    });
  }

  // Get files by parent folder
  static getByParentFolder(parentFolderId = null) {
    return new Promise((resolve, reject) => {
      const query = parentFolderId 
        ? 'SELECT * FROM files WHERE parent_folder = ? ORDER BY is_folder DESC, name ASC'
        : 'SELECT * FROM files WHERE parent_folder IS NULL ORDER BY is_folder DESC, name ASC';
      
      const params = parentFolderId ? [parentFolderId] : [];
      
      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows);
      });
    });
  }

  // Search files by name
  static search(searchTerm) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM files 
        WHERE name LIKE ? 
        ORDER BY is_folder DESC, name ASC
      `;
      
      db.all(query, [`%${searchTerm}%`], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(rows);
      });
    });
  }

  // Update a file
  static update(id, updateData) {
    return new Promise((resolve, reject) => {
      const allowedFields = [
        'name', 'parent_folder', 'telegram_file_id', 
        'telegram_message_id', 'telegram_chat_id'
      ];
      
      const updates = [];
      const values = [];
      
      for (const [key, value] of Object.entries(updateData)) {
        if (allowedFields.includes(key)) {
          updates.push(`${key} = ?`);
          values.push(value);
        }
      }
      
      if (updates.length === 0) {
        resolve(null);
        return;
      }
      
      // Add date_modified
      updates.push('date_modified = CURRENT_TIMESTAMP');
      
      // Add ID to values
      values.push(id);
      
      const query = `
        UPDATE files 
        SET ${updates.join(', ')} 
        WHERE id = ?
      `;
      
      db.run(query, values, function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        if (this.changes === 0) {
          resolve(null);
          return;
        }
        
        File.getById(id).then(resolve).catch(reject);
      });
    });
  }

  // Delete a file
  static delete(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM files WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
          return;
        }
        
        resolve({ deleted: this.changes > 0 });
      });
    });
  }
}

module.exports = File; 