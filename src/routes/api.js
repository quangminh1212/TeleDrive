const express = require('express');
const router = express.Router();
const FileController = require('../controllers/fileController');

// File routes
router.post('/files/upload', FileController.uploadFile);
router.get('/files/download/:id', FileController.downloadFile);
router.get('/files', FileController.listFiles);
router.post('/folders', FileController.createFolder);
router.delete('/files/:id', FileController.deleteFile);
router.get('/files/search', FileController.searchFiles);
router.put('/files/:id/rename', FileController.renameFile);
router.put('/files/:id/move', FileController.moveFile);

module.exports = router; 