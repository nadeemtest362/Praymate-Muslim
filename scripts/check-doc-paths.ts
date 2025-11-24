#!/usr/bin/env node

/**
 * Check documentation files for legacy component paths
 * Prevents regressions in documentation after cleanup
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const LEGACY_PATTERNS = [
  /src\/components\/ui\//g,
  /src\/components\/[a-z-]+\//g,
];

const EXCLUDED_PATHS = [
  'docs/archive',
  'node_modules',
  '.git',
];

function getAllMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  
  function traverse(currentDir: string) {
    const items = readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);
      
      // Skip excluded paths
      if (EXCLUDED_PATHS.some(excluded => fullPath.includes(excluded))) {
        continue;
      }
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function checkFile(filePath: string): { hasIssues: boolean; issues: string[] } {
  const content = readFileSync(filePath, 'utf8');
  const issues: string[] = [];
  
  for (const pattern of LEGACY_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      issues.push(`Found legacy path pattern: ${pattern.source}`);
    }
  }
  
  return {
    hasIssues: issues.length > 0,
    issues
  };
}

function main() {
  console.log('🔍 Checking documentation for legacy component paths...\n');
  
  // Change to project root if we're in scripts directory
  const cwd = process.cwd();
  const rootDir = cwd.endsWith('/scripts') ? join(cwd, '..') : cwd;
  process.chdir(rootDir);
  
  const filesToCheck = [
    ...getAllMarkdownFiles('docs'),
    'README.md',
    'AGENT.md',
    'project_layout.md',
  ].filter(file => {
    try {
      statSync(file);
      return true;
    } catch {
      return false;
    }
  });
  
  let hasAnyIssues = false;
  
  for (const file of filesToCheck) {
    const { hasIssues, issues } = checkFile(file);
    
    if (hasIssues) {
      hasAnyIssues = true;
      console.log(`❌ ${file}:`);
      for (const issue of issues) {
        console.log(`   ${issue}`);
      }
      console.log();
    }
  }
  
  if (hasAnyIssues) {
    console.log('❌ Legacy component paths found in documentation!');
    console.log('Please update these paths to use the new structure:');
    console.log('  src/components/ui/ → src/shared/ui/');
    console.log('  src/components/<feature>/ → src/features/<feature>/');
    process.exit(1);
  } else {
    console.log('✅ All documentation paths are up to date!');
  }
}

main();
