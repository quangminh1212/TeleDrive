/**
 * Create Module Structure Script
 * This script creates the necessary directory structure for the TeleDrive application
 */
const fs = require('fs-extra');
const path = require('path');

// Define the module structure
const structure = {
  'modules': {
    'auth': {
      'controllers': {},
      'services': {},
      'models': {},
      'routes': {}
    },
    'files': {
      'controllers': {},
      'services': {},
      'models': {},
      'routes': {}
    },
    'storage': {
      'controllers': {},
      'services': {},
      'models': {},
      'routes': {}
    },
    'db': {
      'services': {},
      'models': {}
    },
    'common': {
      'middlewares': {},
      'utils': {},
      'config': {}
    }
  },
  'tests': {
    'unit': {
      'auth': {},
      'files': {},
      'storage': {},
      'db': {},
      'common': {}
    },
    'integration': {
      'auth': {},
      'files': {},
      'storage': {}
    },
    'fixtures': {}
  }
};

/**
 * Create directories recursively
 * @param {Object} obj - Directory structure object
 * @param {String} baseDir - Base directory path
 */
const createDirectories = (obj, baseDir) => {
  Object.keys(obj).forEach(dir => {
    const currentPath = path.join(baseDir, dir);
    console.log(`Creating directory: ${currentPath}`);
    fs.ensureDirSync(currentPath);
    
    if (Object.keys(obj[dir]).length > 0) {
      createDirectories(obj[dir], currentPath);
    }
  });
};

// Create the directory structure
const rootPath = path.join(__dirname);
createDirectories(structure, rootPath);

console.log('Directory structure created successfully!');

// Create placeholder README files in each directory to explain purpose
const writeReadme = (obj, baseDir) => {
  Object.keys(obj).forEach(dir => {
    const currentPath = path.join(baseDir, dir);
    const readmePath = path.join(currentPath, 'README.md');
    
    // Write README.md file
    fs.writeFileSync(
      readmePath, 
      `# ${dir.charAt(0).toUpperCase() + dir.slice(1)} Module\n\nThis directory contains ${dir}-related functionality.\n`
    );
    
    if (Object.keys(obj[dir]).length > 0) {
      writeReadme(obj[dir], currentPath);
    }
  });
};

// Create README files
writeReadme(structure, rootPath);
console.log('README files created successfully!'); 