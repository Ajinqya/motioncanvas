import type { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Vite plugin that adds a dev-only API endpoint for saving animation defaults
 */
export function saveDefaultsPlugin(): Plugin {
  return {
    name: 'save-defaults',
    configureServer(server) {
      server.middlewares.use('/api/save-defaults', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { animationId, params } = JSON.parse(body);
            
            if (!animationId || !params) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing animationId or params' }));
              return;
            }

            // Update animation defaults
            const animationPath = path.join(process.cwd(), 'src', 'animations', animationId, 'index.ts');

            if (!fs.existsSync(animationPath)) {
              throw new Error(`Animation not found: ${animationId}`);
            }

            // Read the current animation file
            let content = fs.readFileSync(animationPath, 'utf-8');

            // Find the defaults object and replace it
            const defaultsRegex = /defaults:\s*\{[^}]*\}/s;
            
            // Build the new defaults string with proper formatting
            const entries = Object.entries(params);
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
            const metaPath = path.join(process.cwd(), 'src', 'animations', animationId, 'meta.json');
            if (fs.existsSync(metaPath)) {
              const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
              meta.updatedAt = new Date().toISOString();
              fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
            }
            
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Defaults saved successfully' }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              error: error instanceof Error ? error.message : 'Unknown error' 
            }));
          }
        });
      });
    },
  };
}
