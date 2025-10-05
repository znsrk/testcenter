import fs from 'fs/promises';
import path from 'path';

/**
 * This script fixes import statements that incorrectly include version numbers.
 * For example, it will transform:
 *   import ... from '@radix-ui/react-accordion@1.2.3';
 * into:
 *   import ... from '@radix-ui/react-accordion';
 */

// Regex to find module paths ending with a version number like @1.2.3
const importRegex = /from\s+['"]([^'"]+)@[\d\.]+(?:\-[^'"]+)?['"]/g;

async function fixImportsInFile(filePath) {
  try {
    const originalContent = await fs.readFile(filePath, 'utf-8');

    // Replace versioned imports with clean, version-less paths
    const newContent = originalContent.replace(importRegex, (match, moduleName) => {
      const correctedImport = `from "${moduleName}"`;
      console.log(`Fixing in ${path.basename(filePath)}: ${match} -> ${correctedImport}`);
      return correctedImport;
    });

    // Write the changes back to the file only if content has changed
    if (newContent !== originalContent) {
      await fs.writeFile(filePath, newContent, 'utf-8');
    }
  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
  }
}

async function walkDirectory(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walkDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        await fixImportsInFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Failed to read directory ${dir}:`, error);
  }
}

async function main() {
  // Define the target directory containing the UI components
  const componentsDir = path.resolve(process.cwd(), 'src', 'components', 'ui');
  
  console.log(`Starting import fix process in: ${componentsDir}`);
  await walkDirectory(componentsDir);
  console.log('\n✅ Import fix script finished successfully!');
}

main();