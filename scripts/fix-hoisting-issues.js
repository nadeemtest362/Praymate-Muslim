#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to fix hoisting issues in a file
function fixHoistingInFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has the hoisting issue pattern
  const hasIssue = content.includes('const styles = useMemo(() => createStyles') && 
                   content.includes('const createStyles = (R: ReturnType<typeof useResponsive>)');
  
  if (!hasIssue) {
    return false;
  }
  
  console.log(`Fixing hoisting issue in: ${filePath}`);
  
  // Find the createStyles definition
  const createStylesMatch = content.match(/const createStyles = \(R: ReturnType<typeof useResponsive>\)[\s\S]*?^}\);?$/m);
  
  if (!createStylesMatch) {
    console.log(`  Warning: Could not find createStyles definition in ${filePath}`);
    return false;
  }
  
  const createStylesCode = createStylesMatch[0];
  
  // Remove the createStyles from its current position
  let fixedContent = content.replace(createStylesCode, '');
  
  // Find where to insert it (after imports, before component)
  // Look for the last import statement
  const importMatches = fixedContent.match(/^import .* from .*$/gm);
  if (!importMatches) {
    console.log(`  Warning: No imports found in ${filePath}`);
    return false;
  }
  
  const lastImport = importMatches[importMatches.length - 1];
  const lastImportIndex = fixedContent.lastIndexOf(lastImport);
  const insertPosition = lastImportIndex + lastImport.length;
  
  // Insert createStyles after imports
  fixedContent = fixedContent.slice(0, insertPosition) + '\n\n' + createStylesCode + '\n' + fixedContent.slice(insertPosition);
  
  // Clean up any extra newlines
  fixedContent = fixedContent.replace(/\n{4,}/g, '\n\n\n');
  
  // Write the fixed content back
  fs.writeFileSync(filePath, fixedContent, 'utf8');
  
  return true;
}

// Find all TypeScript files
function findTsxFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules and other build directories
      if (!['node_modules', '.expo', 'ios', 'android', 'dist', 'build'].includes(entry.name)) {
        findTsxFiles(fullPath, files);
      }
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main execution
console.log('Searching for TypeScript files with hoisting issues...\n');

const projectRoot = path.resolve(__dirname, '..');
const tsxFiles = findTsxFiles(projectRoot);

console.log(`Found ${tsxFiles.length} TypeScript files\n`);

let fixedCount = 0;
for (const file of tsxFiles) {
  if (fixHoistingInFile(file)) {
    fixedCount++;
  }
}

console.log(`\nFixed ${fixedCount} files with hoisting issues`); 