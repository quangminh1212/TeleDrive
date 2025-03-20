Phát hiện lỗi encoding trong file-service.js, đang sửa...
const fs = require('fs'
const path = require('path'); 
const crypto = require('crypto'); 
const { promisify } = require('util'); 
const { tdlibStorage } = require('../storage/tdlib-client'); 
const File = require('../db/models/File'); 
const User = require('../db/models/User'); 
const logger = require('../common/logger'); 
const { config } = require('../common/config'); 
