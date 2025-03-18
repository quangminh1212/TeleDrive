/**
 * File Model Tests
 */

const fileModel = require('../../../modules/files/models/file');

// Mock the generateId and utility functions
jest.mock('../../../modules/common/utils', () => ({
  generateId: jest.fn(() => 'test-id-123'),
  getMimeType: jest.fn(fileName => {
    if (fileName.endsWith('.jpg')) return 'image/jpeg';
    if (fileName.endsWith('.pdf')) return 'application/pdf';
    return 'application/octet-stream';
  }),
  guessFileType: jest.fn(fileName => {
    if (fileName.endsWith('.jpg')) return 'image';
    if (fileName.endsWith('.pdf')) return 'document';
    return 'other';
  })
}));

// Test createFile function
describe('createFile', () => {
  test('should create a file object with provided data', () => {
    const fileData = {
      name: 'test.jpg',
      size: 1024,
      caption: 'Test image',
      localPath: '/path/to/test.jpg',
      telegramFileId: 'telegram-file-id'
    };
    
    const file = fileModel.createFile(fileData);
    
    expect(file.id).toBe('test-id-123');
    expect(file.name).toBe(fileData.name);
    expect(file.size).toBe(fileData.size);
    expect(file.caption).toBe(fileData.caption);
    expect(file.localPath).toBe(fileData.localPath);
    expect(file.telegramFileId).toBe(fileData.telegramFileId);
    expect(file.mimeType).toBe('image/jpeg');
    expect(file.type).toBe('image');
    expect(file.isDeleted).toBe(false);
    expect(file.uploadDate).toBeDefined();
    expect(file.updatedAt).toBeDefined();
  });
  
  test('should use defaults for missing data', () => {
    const file = fileModel.createFile({
      name: 'empty.pdf'
    });
    
    expect(file.id).toBe('test-id-123');
    expect(file.name).toBe('empty.pdf');
    expect(file.size).toBe(0);
    expect(file.caption).toBe('');
    expect(file.localPath).toBeNull();
    expect(file.telegramFileId).toBeNull();
    expect(file.mimeType).toBe('application/pdf');
    expect(file.type).toBe('document');
    expect(file.isDeleted).toBe(false);
  });
});

// Test createFileFromTelegram function
describe('createFileFromTelegram', () => {
  test('should create file from telegram data', () => {
    const telegramFile = {
      file_id: 'telegram-file-id',
      message_id: 123,
      chat_id: 456,
      file_name: 'telegram.jpg',
      file_size: 2048,
      mime_type: 'image/jpeg',
      date: Math.floor(Date.now() / 1000),
      caption: 'From Telegram'
    };
    
    const file = fileModel.createFileFromTelegram(telegramFile);
    
    expect(file.id).toBe('test-id-123');
    expect(file.name).toBe(telegramFile.file_name);
    expect(file.size).toBe(telegramFile.file_size);
    expect(file.telegramFileId).toBe(telegramFile.file_id);
    expect(file.telegramMessageId).toBe(telegramFile.message_id);
    expect(file.chatId).toBe(telegramFile.chat_id);
    expect(file.caption).toBe(telegramFile.caption);
    expect(file.mimeType).toBe(telegramFile.mime_type);
    expect(file.type).toBe('image');
    expect(file.isDeleted).toBe(false);
  });
  
  test('should handle missing file name in telegram data', () => {
    const telegramFile = {
      file_id: 'telegram-file-id',
      message_id: 123,
      chat_id: 456,
      type: 'document',
      file_size: 2048,
      mime_type: 'application/pdf',
      date: Math.floor(Date.now() / 1000)
    };
    
    const file = fileModel.createFileFromTelegram(telegramFile);
    
    expect(file.name).toMatch(/^document_\d+$/);
    expect(file.telegramFileId).toBe(telegramFile.file_id);
    expect(file.mimeType).toBe(telegramFile.mime_type);
    expect(file.caption).toBe('');
  });
});

// Test updateFile function
describe('updateFile', () => {
  test('should update file with new data', () => {
    const originalFile = {
      id: 'file-id',
      name: 'original.jpg',
      size: 1024,
      caption: 'Original',
      updatedAt: '2023-01-01T00:00:00.000Z'
    };
    
    const updates = {
      name: 'updated.jpg',
      caption: 'Updated'
    };
    
    const updatedFile = fileModel.updateFile(originalFile, updates);
    
    expect(updatedFile.id).toBe(originalFile.id);
    expect(updatedFile.name).toBe(updates.name);
    expect(updatedFile.caption).toBe(updates.caption);
    expect(updatedFile.size).toBe(originalFile.size);
    expect(updatedFile.updatedAt).not.toBe(originalFile.updatedAt);
  });
});

// Test markFileAsDeleted and restoreFile functions
describe('file deletion and restoration', () => {
  test('should mark file as deleted', () => {
    const file = {
      id: 'file-id',
      name: 'test.jpg',
      isDeleted: false,
      deletedAt: null
    };
    
    const deletedFile = fileModel.markFileAsDeleted(file);
    
    expect(deletedFile.id).toBe(file.id);
    expect(deletedFile.name).toBe(file.name);
    expect(deletedFile.isDeleted).toBe(true);
    expect(deletedFile.deletedAt).not.toBeNull();
    expect(deletedFile.updatedAt).toBeDefined();
  });
  
  test('should restore deleted file', () => {
    const file = {
      id: 'file-id',
      name: 'test.jpg',
      isDeleted: true,
      deletedAt: new Date().toISOString()
    };
    
    const restoredFile = fileModel.restoreFile(file);
    
    expect(restoredFile.id).toBe(file.id);
    expect(restoredFile.name).toBe(file.name);
    expect(restoredFile.isDeleted).toBe(false);
    expect(restoredFile.deletedAt).toBeNull();
    expect(restoredFile.updatedAt).toBeDefined();
  });
}); 