import type { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { loadEnv } from 'vite';

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
 * System prompt for AI animation generation — crafted for top-quality output
 */
const ANIMATION_SYSTEM_PROMPT = `You are a world-class motion designer and creative coder who specializes in Canvas 2D animations. You think like a professional motion graphics artist — every frame matters, every easing is deliberate, and every detail serves the overall composition.

# YOUR TASK
Generate a complete TypeScript animation file for a canvas animation lab. The animation must be visually stunning, loop seamlessly, and feel polished enough for a design portfolio.

# EXACT FILE FORMAT

\`\`\`typescript
import type { AnimationDefinition } from '../../runtime/types';
import { number, color, boolean, folder, select } from '../../runtime/params';

// Define easing functions, helper utilities, and data OUTSIDE render
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

interface <PascalCaseName>Params {
  scale: number;
  primaryColor: string;
  backgroundColor: string;
  speed: number;
  // ... animation-specific params
}

const animation: AnimationDefinition<<PascalCaseName>Params> = {
  id: '<kebab-case-id>',
  name: '<Display Name>',
  fps: 60,
  durationMs: 3000,    // 2000-6000ms typical
  width: 400,
  height: 400,
  background: '#0A0A0A',

  params: {
    defaults: { /* match schema values */ },
    schema: {
      ...folder('Layout', {
        scale: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Scale' }),
      }),
      ...folder('Colors', {
        primaryColor: color({ value: '#000000', label: 'Primary Color' }),
        backgroundColor: color({ value: '#0A0A0A', label: 'Background' }),
      }),
      ...folder('Animation', {
        speed: number({ value: 1, min: 0.1, max: 3, step: 0.1, label: 'Speed' }),
      }),
    },
  },

  render({ ctx, time, width, height, progress, params }) {
    // Destructure all params
    // Clear background
    // Apply transforms: translate to center, apply scale
    // Animation logic using progress (0→1) or time (seconds)
    // Restore canvas state
  },
};

export default animation;
\`\`\`

# MOTION DESIGN PRINCIPLES — follow these strictly

## 1. Easing & Timing
- NEVER use linear motion for primary elements — it looks robotic and cheap.
- Use easeOutCubic for entrances, easeInCubic for exits, easeInOutCubic for continuous motion.
- Stagger multiple elements with small delays (0.03–0.1s) for organic feel.
- For bouncy/playful: use easeOutBack or easeOutElastic.
- For elegant/smooth: use easeInOutQuart or easeInOutSine.

## 2. Seamless Looping
- The animation MUST loop seamlessly. progress goes 0→1 and repeats.
- Use \`Math.sin(progress * Math.PI * 2)\` for smooth oscillations that loop.
- Use \`(progress * speed) % 1\` to control looping speed.
- Avoid sudden jumps at progress=0 and progress=1.

## 3. Visual Richness
- Layer multiple elements at different speeds/phases for depth (parallax).
- Use transparency (globalAlpha) and blending (globalCompositeOperation) for glow/light effects.
- Add subtle secondary motion — small rotations, gentle drifts, soft pulses.
- Use gradients instead of flat colors where it adds depth.
- Dark backgrounds (#0A0A0A, #0D1117, #1A1A2E) make colors pop.

## 4. Color
- Use harmonious palettes. Good combos: cyan+magenta, orange+purple, gold+navy.
- For glowing effects: use lighter/saturated center with darker edges.
- Use \`globalCompositeOperation = 'lighter'\` for additive light blending.
- Expose 2-3 color params so users can customize the palette.

## 5. Composition
- Center-out designs feel balanced. Radial symmetry is visually pleasing.
- Leave breathing room — don't fill the entire canvas edge-to-edge.
- Use the scale param to let users adjust density.
- Consider the aspect ratio when positioning elements.

# EASING LIBRARY — use these (define outside render)

\`\`\`typescript
const easeInQuad = (t: number) => t * t;
const easeOutQuad = (t: number) => t * (2 - t);
const easeInOutQuad = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOutQuart = (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
const easeOutBack = (t: number) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const easeOutElastic = (t: number) => t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
\`\`\`

# USEFUL CANVAS TECHNIQUES

\`\`\`typescript
// Glow effect
ctx.shadowColor = color;
ctx.shadowBlur = 20;
ctx.globalCompositeOperation = 'lighter';

// Gradients
const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
grad.addColorStop(0, 'rgba(255,255,255,1)');
grad.addColorStop(1, 'rgba(255,255,255,0)');

// Smooth looping value
const wave = Math.sin(progress * Math.PI * 2); // -1 to 1, loops perfectly
const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 2); // 0 to 1

// Staggered timing for element i of N
const stagger = Math.max(0, Math.min(1, (progress - i * delay) / duration));
const easedStagger = easeOutCubic(stagger);

// Polar coordinates for radial layouts
const angle = (i / count) * Math.PI * 2 + progress * Math.PI * 2;
const x = Math.cos(angle) * radius;
const y = Math.sin(angle) * radius;
\`\`\`

# PARAM TYPES AVAILABLE

- \`number({ value, min, max, step, label })\` — slider
- \`color({ value, label })\` — color picker
- \`boolean({ value, label })\` — toggle
- \`select({ value, options: string[], label })\` — dropdown
- \`folder(name, { ...params })\` — collapsible group (always use folders)

# VALID CANVAS SIZES (aspect ratios)

| Ratio | Size |
|-------|------|
| 1:1   | 400×400 or 500×500 |
| 16:9  | 960×540 |
| 9:16  | 540×960 |
| 4:3   | 800×600 |

# CRITICAL RULES

1. Define easing functions and data arrays OUTSIDE the render function.
2. Always call ctx.beginPath() before drawing any new path.
3. Always use ctx.save() / ctx.restore() around transform blocks.
4. Use progress (0→1) for timing, not time directly (unless you need continuous non-looping time).
5. Ensure the animation loops perfectly — no visual pops or jumps.
6. Make it genuinely beautiful. Think: Apple keynote animation quality. Dribbble-worthy.
7. Expose at least: scale, speed, backgroundColor, and 1-2 primary colors.
8. Choose a size that fits the content — use 1:1 for radial/symmetric, 16:9 for landscape scenes.

# ITERATING ON EXISTING ANIMATIONS

The user's message may include context about existing animations in their gallery. This context looks like:

\`\`\`
[EXISTING ANIMATION: <id>]
<full TypeScript source code>
[END ANIMATION]
\`\`\`

When the user asks to modify, improve, or iterate on an existing animation:
- Use the SAME "id" in your response so it overwrites the existing file.
- Keep the same "name" unless the user wants to rename it.
- Preserve the overall structure but apply the requested changes.
- Carry forward any custom easing functions, data arrays, or helpers from the original.
- If the user says something vague like "make it better", improve the visual quality: add easing, layer effects, improve colors, add subtle secondary motion.

When the user references an animation by name (e.g. "update the playhead animation"), look for the matching animation in the context provided with the message.

When the user asks to create something NEW (no reference to an existing animation), generate a fresh animation with a new id.

# RESPONSE FORMAT

Respond with ONLY a raw JSON object. No markdown fences, no explanation before or after.

{
  "id": "kebab-case-id",
  "name": "Display Name",
  "code": "...complete TypeScript file as a string...",
  "description": "One sentence describing what changed (for iterations) or what the animation does (for new ones).",
  "tags": ["tag1", "tag2", "tag3"]
}

The "code" value must be the ENTIRE TypeScript file content as a single JSON string (use \\n for newlines). It must compile without errors and produce a beautiful animation on first run.`;

/**
 * Vite plugin that adds dev-only API endpoints for animation management
 */
export function saveDefaultsPlugin(): Plugin {
  return {
    name: 'save-defaults',
    configureServer(server) {
      // Load .env into process.env for server-side access
      const env = loadEnv('development', process.cwd(), '');
      Object.assign(process.env, env);

      // API: List all animations (id, name, source code)
      server.middlewares.use('/api/animations-list', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        try {
          const animationsDir = path.join(process.cwd(), 'src', 'animations');
          const entries = fs.readdirSync(animationsDir, { withFileTypes: true });
          const animations: { id: string; name: string; source: string }[] = [];

          for (const entry of entries) {
            if (!entry.isDirectory() || entry.name === 'registry.ts') continue;

            const indexPath = path.join(animationsDir, entry.name, 'index.ts');
            const metaPath = path.join(animationsDir, entry.name, 'meta.json');

            if (!fs.existsSync(indexPath)) continue;

            const source = fs.readFileSync(indexPath, 'utf-8');

            // Try to get name from meta.json, fall back to folder name
            let name = entry.name;
            if (fs.existsSync(metaPath)) {
              try {
                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                if (meta.name) name = meta.name;
              } catch { /* ignore parse errors */ }
            }

            animations.push({ id: entry.name, name, source });
          }

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(animations));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: error instanceof Error ? error.message : 'Unknown error',
          }));
        }
      });

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

      // API: AI Chat - Generate animation from natural language
      server.middlewares.use('/api/chat-create-animation', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', (chunk: string) => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const { messages, apiKey } = JSON.parse(body);

            if (!messages || !Array.isArray(messages) || messages.length === 0) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing or invalid messages array' }));
              return;
            }

            const key = apiKey || process.env.OPENAI_API_KEY;
            if (!key) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'No OpenAI API key provided. Set OPENAI_API_KEY in .env or pass it in the chat.' }));
              return;
            }

            const openai = new OpenAI({ apiKey: key });

            // Build the message history for OpenAI
            const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
              { role: 'system', content: ANIMATION_SYSTEM_PROMPT },
              ...messages.map((m: { role: string; content: string }) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
            ];

            // Model preference: gpt-4.1 (best for code), fallback to gpt-4o
            // If you have Tier 1+ access, you can use 'gpt-5.2' for even better results
            const completion = await openai.chat.completions.create({
              model: 'gpt-4.1',
              messages: chatMessages,
              temperature: 0.7,
              max_tokens: 8192,
            });

            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'No response from OpenAI' }));
              return;
            }

            // Parse the JSON response from the AI
            let parsed: { id: string; name: string; code: string; description: string; tags: string[] };
            try {
              // Strip markdown code fences if present
              let cleanText = responseText.trim();
              if (cleanText.startsWith('```')) {
                cleanText = cleanText.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?\s*```$/, '');
              }
              parsed = JSON.parse(cleanText);
            } catch {
              // If JSON parsing fails, try to extract JSON from the response
              const jsonMatch = responseText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  parsed = JSON.parse(jsonMatch[0]);
                } catch {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    success: false,
                    reply: responseText,
                    error: 'Could not parse animation code from AI response',
                  }));
                  return;
                }
              } else {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: false,
                  reply: responseText,
                  error: 'AI response was not in expected JSON format',
                }));
                return;
              }
            }

            const { id, name, code, description, tags } = parsed;

            if (!id || !name || !code) {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: false,
                reply: description || responseText,
                error: 'AI response missing required fields (id, name, code)',
              }));
              return;
            }

            // Clean the ID to be filesystem-safe
            const cleanId = id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

            // Check if animation already exists
            const animationDir = path.join(process.cwd(), 'src', 'animations', cleanId);
            if (fs.existsSync(animationDir)) {
              // If it exists, overwrite it (for iteration/refinement)
              fs.writeFileSync(path.join(animationDir, 'index.ts'), code);
              const metaContent = JSON.stringify({
                id: cleanId,
                name,
                createdAt: new Date().toISOString().split('T')[0],
                updatedAt: new Date().toISOString(),
                source: 'ai-chat',
                prompt: messages[messages.length - 1]?.content || '',
                tags: tags || ['ai-generated'],
              }, null, 2);
              fs.writeFileSync(path.join(animationDir, 'meta.json'), metaContent);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                id: cleanId,
                name,
                description,
                path: `/a/${cleanId}`,
                updated: true,
                reply: description || `Updated "${name}" animation.`,
              }));
              return;
            }

            // Create new animation directory and files
            fs.mkdirSync(animationDir, { recursive: true });
            fs.writeFileSync(path.join(animationDir, 'index.ts'), code);

            const metaContent = JSON.stringify({
              id: cleanId,
              name,
              createdAt: new Date().toISOString().split('T')[0],
              source: 'ai-chat',
              prompt: messages[messages.length - 1]?.content || '',
              tags: tags || ['ai-generated'],
            }, null, 2);
            fs.writeFileSync(path.join(animationDir, 'meta.json'), metaContent);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({
              success: true,
              id: cleanId,
              name,
              description,
              path: `/a/${cleanId}`,
              reply: description || `Created "${name}" animation!`,
            }));
          } catch (error) {
            console.error('Chat API error:', error);
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
