#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Recursively delete a directory and its contents
 * @param {string} dirPath - Path to the directory to delete
 */
function deleteDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        deleteDirectory(filePath);
      } else {
        fs.unlinkSync(filePath);
        console.log(`  Deleted file: ${filePath}`);
      }
    });

    fs.rmdirSync(dirPath);
    console.log(`  Deleted directory: ${dirPath}`);
  } else {
    console.log(`  Directory does not exist: ${dirPath}`);
  }
}

/**
 * Delete all files in a directory but keep the directory itself
 * @param {string} dirPath - Path to the directory to clean
 */
function cleanDirectory(dirPath) {
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    let count = 0;

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        deleteDirectory(filePath);
        count++;
      } else {
        fs.unlinkSync(filePath);
        console.log(`  Deleted file: ${filePath}`);
        count++;
      }
    });

    if (count > 0) {
      console.log(`  Cleaned directory: ${dirPath} (${count} items removed)`);
    } else {
      console.log(`  Directory is already clean: ${dirPath}`);
    }
  } else {
    console.log(`  Directory does not exist: ${dirPath}`);
  }
}

/**
 * Main cleanup function
 */
function cleanup() {
  console.log('Starting cleanup...\n');

  const rootDir = path.join(__dirname, '..');

  // Directories to clean
  const directoriesToClean = [
    path.join(rootDir, 'backend', 'data', 'databases'),
    path.join(rootDir, 'backend', 'uploads'),
    path.join(rootDir, 'data'),
  ];

  directoriesToClean.forEach(dir => {
    console.log(`\nCleaning: ${dir}`);
    cleanDirectory(dir);
  });

  console.log('\n✓ Cleanup completed!');
}

// Run cleanup
try {
  cleanup();
} catch (error) {
  console.error('\n✗ Error during cleanup:', error.message);
  process.exit(1);
}
