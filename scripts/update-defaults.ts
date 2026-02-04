#!/usr/bin/env npx tsx

/**
 * Update animation defaults
 * 
 * This script updates the default parameter values in an animation file
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UpdateRequest {
  animationId: string;
  params: Record<string, any>;
}

export function updateAnimationDefaults(animationId: string, newDefaults: Record<string, any>): void {
  const srcDir = path.resolve(__dirname, '../src');
  const animationPath = path.join(srcDir, 'animations', animationId, 'index.ts');

  if (!fs.existsSync(animationPath)) {
    throw new Error(`Animation not found: ${animationId}`);
  }

  // Read the current animation file
  let content = fs.readFileSync(animationPath, 'utf-8');

  // Find the defaults object and replace it
  const defaultsRegex = /defaults:\s*\{[^}]*\}/s;
  
  // Build the new defaults string with proper formatting
  const entries = Object.entries(newDefaults);
  const defaultsLines = entries.map(([key, value]) => {
    let formattedValue: string;
    
    if (typeof value === 'string') {
      formattedValue = `'${value}'`;
    } else if (typeof value === 'boolean') {
      formattedValue = value.toString();
    } else if (typeof value === 'number') {
      formattedValue = value.toString();
    } else {
      formattedValue = JSON.stringify(value);
    }
    
    return `      ${key}: ${formattedValue}`;
  });

  const newDefaultsBlock = `defaults: {\n${defaultsLines.join(',\n')},\n    }`;

  // Replace the defaults block
  content = content.replace(defaultsRegex, newDefaultsBlock);

  // Write back to file
  fs.writeFileSync(animationPath, content, 'utf-8');
  
  // Update the meta.json updatedAt timestamp
  const metaPath = path.join(srcDir, 'animations', animationId, 'meta.json');
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    meta.updatedAt = new Date().toISOString();
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/update-defaults.ts <animation-id> <params-json>');
    process.exit(1);
  }

  const animationId = args[0];
  const params = JSON.parse(args[1]);

  try {
    updateAnimationDefaults(animationId, params);
    console.log(`✓ Updated defaults for ${animationId}`);
  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}
