#!/usr/bin/env npx tsx

/**
 * Promote script - moves the draft animation into the gallery
 *
 * Usage:
 *   npm run promote -- --id my-animation
 *   npm run promote -- --id my-animation --prompt "Create a bouncing ball"
 *   npm run promote -- --id my-animation --tags "motion,ball,loop"
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return undefined;
}

async function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const srcDir = path.resolve(__dirname, '../src');
  const draftPath = path.join(srcDir, 'draft/animation.ts');
  const animationsDir = path.join(srcDir, 'animations');

  // Check draft exists
  if (!fs.existsSync(draftPath)) {
    console.error('Error: No draft animation found at src/draft/animation.ts');
    process.exit(1);
  }

  // Get animation ID
  let id = getArg('id');
  if (!id) {
    id = await prompt('Animation ID (lowercase, no spaces): ');
  }

  if (!id || !/^[a-z0-9-]+$/.test(id)) {
    console.error('Error: Invalid ID. Use lowercase letters, numbers, and hyphens only.');
    process.exit(1);
  }

  const targetDir = path.join(animationsDir, id);

  // Check if already exists
  if (fs.existsSync(targetDir)) {
    const overwrite = await prompt(`Animation "${id}" already exists. Overwrite? (y/n): `);
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted.');
      process.exit(0);
    }
  }

  // Get metadata
  let name = getArg('name');
  if (!name) {
    name = await prompt('Animation name (display name): ');
  }

  let promptText = getArg('prompt');
  if (!promptText) {
    promptText = await prompt('Source prompt (the instructions used to create this): ');
  }

  let tagsStr = getArg('tags');
  if (!tagsStr) {
    tagsStr = await prompt('Tags (comma-separated): ');
  }
  const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()).filter(Boolean) : [];

  let sourceType = getArg('source') as 'figma' | 'screenshot' | 'none' | undefined;
  if (!sourceType) {
    const sourceInput = await prompt('Source type (figma/screenshot/none): ');
    sourceType = ['figma', 'screenshot', 'none'].includes(sourceInput)
      ? (sourceInput as 'figma' | 'screenshot' | 'none')
      : 'none';
  }

  let figmaUrl: string | undefined;
  if (sourceType === 'figma') {
    figmaUrl = getArg('figma-url') || await prompt('Figma URL: ');
  }

  // Create target directory
  fs.mkdirSync(targetDir, { recursive: true });

  // Read and modify draft animation
  let draftCode = fs.readFileSync(draftPath, 'utf-8');

  // Update the ID in the code
  draftCode = draftCode.replace(/id:\s*['"]draft['"]/, `id: '${id}'`);

  // Update the name if provided
  if (name) {
    draftCode = draftCode.replace(
      /name:\s*['"][^'"]*['"]/,
      `name: '${name.replace(/'/g, "\\'")}'`
    );
  }

  // Remove the draft-specific comments
  draftCode = draftCode.replace(
    /\/\*\*[\s\S]*?Once you're happy[\s\S]*?\*\/\n*/,
    ''
  );

  // Write the animation file
  fs.writeFileSync(path.join(targetDir, 'index.ts'), draftCode);

  // Create meta.json
  const now = new Date().toISOString();
  const meta = {
    id,
    name: name || id,
    createdAt: now,
    updatedAt: now,
    source: {
      type: sourceType,
      ...(figmaUrl && { figmaUrl }),
    },
    prompt: promptText || '',
    tags,
  };

  fs.writeFileSync(
    path.join(targetDir, 'meta.json'),
    JSON.stringify(meta, null, 2)
  );

  console.log(`\n✓ Animation promoted to: src/animations/${id}/`);
  console.log(`  - index.ts`);
  console.log(`  - meta.json`);
  console.log(`\nView it at: http://localhost:5173/a/${id}`);
}

main().catch(console.error);
