import type { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate animation index.ts template
 */
function generateAnimationTemplate(config: {
  id: string;
  name: string;
  width: number;
  height: number;
  background: string;
  durationMs: number;
  fps: number;
  hasImage: boolean;
  imagePath?: string;
}): string {
  const { id, name, width, height, background, durationMs, fps, hasImage, imagePath } = config;
  
  const imageAsset = hasImage ? `
  assets: [
    { id: 'imported-image', type: 'image', src: '${imagePath}' },
  ],
` : '';

  const imageDrawCode = hasImage ? `
    // Draw imported image centered
    const img = assets.getImage('imported-image');
    if (img) {
      const imgScale = Math.min(
        (width * 0.8) / img.width,
        (height * 0.8) / img.height
      );
      const imgWidth = img.width * imgScale;
      const imgHeight = img.height * imgScale;
      ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    }
` : `
    // Placeholder - draw a centered circle
    ctx.fillStyle = primaryColor;
    ctx.beginPath();
    ctx.arc(0, 0, 50 * (0.5 + 0.5 * progress), 0, Math.PI * 2);
    ctx.fill();
`;

  return `import type { AnimationDefinition } from '../../runtime/types';
import { number, color, folder } from '../../runtime/params';

/**
 * ${name}
 * Created via Animation Creator
 */

interface ${name.replace(/[^a-zA-Z0-9]/g, '')}Params {
  scale: number;
  primaryColor: string;
  backgroundColor: string;
  speed: number;
}

const animation: AnimationDefinition<${name.replace(/[^a-zA-Z0-9]/g, '')}Params> = {
  id: '${id}',
  name: '${name}',
  fps: ${fps},
  durationMs: ${durationMs},
  width: ${width},
  height: ${height},
  background: '${background}',
${imageAsset}
  params: {
    defaults: {
      scale: 1,
      primaryColor: '#000000',
      backgroundColor: '${background}',
      speed: 1,
    },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#000000', label: 'Primary Color' }),
        backgroundColor: color({ value: '${background}', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, width, height, progress, params${hasImage ? ', assets' : ''} }) {
    const { scale, primaryColor, backgroundColor, speed } = params;
    
    // Apply speed to progress
    const adjustedProgress = (progress * speed) % 1;
    void adjustedProgress; // Available for animation logic
    
    // Clear background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Center and scale content
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
${imageDrawCode}
    ctx.restore();
  },
};

export default animation;
`;
}

/**
 * Generate meta.json content
 */
function generateMetaJson(config: {
  id: string;
  name: string;
  prompt?: string;
  tags?: string[];
}): string {
  return JSON.stringify({
    id: config.id,
    name: config.name,
    createdAt: new Date().toISOString().split('T')[0],
    source: 'animation-creator',
    prompt: config.prompt || 'Created via Animation Creator',
    tags: config.tags || ['custom'],
  }, null, 2);
}

/**
 * Vite plugin that adds dev-only API endpoints for animation management
 */
export function saveDefaultsPlugin(): Plugin {
  return {
    name: 'save-defaults',
    configureServer(server) {
      // API: Create new animation
      server.middlewares.use('/api/create-animation', async (req, res) => {
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
            const config = JSON.parse(body);
            const { id, name, width, height, background, durationMs, fps, hasImage, imagePath, prompt, tags } = config;

            if (!id || !name) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Missing id or name' }));
              return;
            }

            // Create animation directory
            const animationDir = path.join(process.cwd(), 'src', 'animations', id);
            
            if (fs.existsSync(animationDir)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: `Animation "${id}" already exists` }));
              return;
            }

            fs.mkdirSync(animationDir, { recursive: true });

            // Generate and write index.ts
            const indexContent = generateAnimationTemplate({
              id,
              name,
              width: width || 400,
              height: height || 400,
              background: background || '#FFFFFF',
              durationMs: durationMs || 3000,
              fps: fps || 60,
              hasImage: !!hasImage,
              imagePath: imagePath || '',
            });
            fs.writeFileSync(path.join(animationDir, 'index.ts'), indexContent);

            // Generate and write meta.json
            const metaContent = generateMetaJson({ id, name, prompt, tags });
            fs.writeFileSync(path.join(animationDir, 'meta.json'), metaContent);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, id, path: `/a/${id}` }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
          }
        });
      });

      // API: Upload image
      server.middlewares.use('/api/upload-image', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk) => {
          chunks.push(chunk);
        });

        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks);
            const boundary = req.headers['content-type']?.split('boundary=')[1];
            
            if (!boundary) {
              // Try parsing as JSON with base64
              const json = JSON.parse(body.toString());
              const { filename, data } = json;
              
              if (!filename || !data) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing filename or data' }));
                return;
              }

              // Decode base64 and save
              const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
              const imageBuffer = Buffer.from(base64Data, 'base64');
              
              const imagePath = path.join(process.cwd(), 'public', 'images', filename);
              fs.writeFileSync(imagePath, imageBuffer);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, path: `/images/${filename}` }));
              return;
            }

            // Parse multipart form data (basic implementation)
            const bodyStr = body.toString('binary');
            const parts = bodyStr.split(`--${boundary}`);
            
            for (const part of parts) {
              if (part.includes('filename=')) {
                const filenameMatch = part.match(/filename="([^"]+)"/);
                if (filenameMatch) {
                  const filename = filenameMatch[1];
                  const contentStart = part.indexOf('\r\n\r\n') + 4;
                  const contentEnd = part.lastIndexOf('\r\n');
                  const content = part.slice(contentStart, contentEnd);
                  
                  const imagePath = path.join(process.cwd(), 'public', 'images', filename);
                  fs.writeFileSync(imagePath, Buffer.from(content, 'binary'));

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, path: `/images/${filename}` }));
                  return;
                }
              }
            }

            res.statusCode = 400;
            res.end(JSON.stringify({ error: 'No file found in request' }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
          }
        });
      });

      // API: Save defaults (existing functionality)
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

      // API: Get tab organisation defaults from disk
      const tabDefaultsPath = path.join(process.cwd(), 'tab-organization.json');

      server.middlewares.use('/api/tab-defaults', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          if (fs.existsSync(tabDefaultsPath)) {
            const data = fs.readFileSync(tabDefaultsPath, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'No saved tab defaults found' }));
          }
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      });

      // API: Save tab organisation defaults to disk
      server.middlewares.use('/api/save-tab-defaults', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk: string) => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const { tabs, assignments } = payload;

            if (!Array.isArray(tabs)) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid payload: tabs must be an array' }));
              return;
            }

            fs.writeFileSync(tabDefaultsPath, JSON.stringify({ tabs, assignments: assignments || {} }, null, 2), 'utf-8');

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Tab defaults saved' }));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }));
          }
        });
      });
    },
  };
}
