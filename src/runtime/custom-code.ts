/**
 * Compiles user-provided canvas code into a SimpleAnimationDefinition
 * that the sequence player can render like any other animation.
 *
 * Supports TWO formats:
 *
 * ── Format A: Simple render function ─────────────────────────────────────────
 *
 *   function render(ctx, { width, height, progress }) { ... }
 *   // or arrow function, or just the function body
 *
 * ── Format B: Full AnimationDefinition module (TypeScript or JS) ─────────────
 *
 *   import type { AnimationDefinition } from '../../runtime/types';
 *   import { number, color, folder } from '../../runtime/params';
 *   interface MyParams { ... }
 *   const animation: AnimationDefinition<MyParams> = {
 *     id: 'my-anim', name: 'My Anim', width: 960, height: 540,
 *     params: { defaults: { ... }, schema: { ... } },
 *     render({ ctx, width, height, progress, params }) { ... },
 *   };
 *   export default animation;
 *
 *   TypeScript is stripped at compile time. Param helpers are stubbed.
 *   The render function is wrapped to bake-in default param values.
 */

import type { SimpleAnimationDefinition } from './types';
import type { CustomCodeConfig } from './sequence';

// ─── Detection ───────────────────────────────────────────────────────────────

/** Check if code looks like a full AnimationDefinition module */
export function isFullAnimationModule(code: string): boolean {
  return (
    (/const\s+animation\s*[=:]/.test(code) || /export\s+default/.test(code)) &&
    /render\s*[\({]/.test(code) &&
    (/AnimationDefinition/.test(code) || /params\s*:\s*\{/.test(code) || /durationMs\s*:/.test(code))
  );
}

// ─── Main Public API ─────────────────────────────────────────────────────────

/**
 * Compile code (either format) into a SimpleAnimationDefinition.
 * Returns null on failure.
 */
export function compileCustomCode(
  code: string,
  config?: CustomCodeConfig
): SimpleAnimationDefinition | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  try {
    if (isFullAnimationModule(trimmed)) {
      return compileFullModule(trimmed, config);
    }
    return compileSimpleRenderFunction(trimmed, config);
  } catch (e) {
    console.warn('[custom-code] Compilation failed:', e);
    return null;
  }
}

/**
 * Validate code without creating a full animation.
 * Returns an error message string, or null if the code is valid.
 */
export function validateCustomCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return 'Code is empty';

  try {
    const result = compileCustomCode(trimmed);
    return result ? null : 'Could not compile code';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

/**
 * Extract animation config from full module code.
 * Returns extracted config if the code is a full module, null otherwise.
 * Useful for auto-filling the config panel in the UI.
 */
export function extractModuleConfig(code: string): CustomCodeConfig | null {
  const trimmed = code.trim();
  if (!isFullAnimationModule(trimmed)) return null;

  try {
    const js = stripTypeScript(trimmed);
    const animDef = executeModule(js);
    if (!animDef) return null;

    return {
      name: animDef.name || 'Custom Animation',
      fps: animDef.fps ?? 60,
      durationMs: animDef.durationMs ?? 3000,
      width: animDef.width ?? 800,
      height: animDef.height ?? 600,
      background: animDef.background || '#000000',
    };
  } catch {
    return null;
  }
}

/** Default template code shown in the editor */
export const CUSTOM_CODE_TEMPLATE = `function render(ctx, { width, height, progress }) {
  // Clear background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);

  // Animated circle
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) * 0.3;
  const radius = maxRadius * progress;

  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#e94560';
  ctx.fill();

  // Label
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(\`Progress: \${(progress * 100).toFixed(0)}%\`, centerX, centerY);
}`;

// ─── Format A: Simple Render Function Compiler ───────────────────────────────

function compileSimpleRenderFunction(
  code: string,
  config?: CustomCodeConfig
): SimpleAnimationDefinition | null {
  const renderFn = parseRenderFunction(code);
  if (!renderFn) return null;

  return {
    name: config?.name || 'Custom Code',
    width: config?.width || 800,
    height: config?.height || 600,
    durationMs: config?.durationMs || 3000,
    fps: config?.fps || 60,
    background: config?.background || '#000000',
    render: (ctx, opts) => {
      try {
        renderFn(ctx, opts);
      } catch (e) {
        drawError(ctx, opts.width, opts.height, e);
      }
    },
  };
}

/**
 * Parse a simple render function from code.
 * Supports: function declaration, arrow function, or just the body.
 */
function parseRenderFunction(
  code: string
): ((ctx: CanvasRenderingContext2D, opts: { width: number; height: number; progress: number }) => void) | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  // Format: function render(ctx, { width, height, progress }) { ... }
  const fnDeclMatch = trimmed.match(
    /^function\s+\w+\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*$/
  );
  if (fnDeclMatch) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('ctx', '__opts__', `
        var { width, height, progress } = __opts__;
        ${fnDeclMatch[2]}
      `);
      return fn as any;
    } catch { /* fall through */ }
  }

  // Format: (ctx, { width, height, progress }) => { ... }
  const arrowMatch = trimmed.match(
    /^\(([^)]*)\)\s*=>\s*\{([\s\S]*)\}\s*$/
  );
  if (arrowMatch) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('ctx', '__opts__', `
        var { width, height, progress } = __opts__;
        ${arrowMatch[2]}
      `);
      return fn as any;
    } catch { /* fall through */ }
  }

  // Format: just the body — ctx, width, height, progress are available
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('ctx', '__opts__', `
      var { width, height, progress } = __opts__;
      ${trimmed}
    `);
    return fn as any;
  } catch (e) {
    console.warn('[custom-code] Failed to compile as function body:', e);
    return null;
  }
}

// ─── Format B: Full AnimationDefinition Module Compiler ──────────────────────

function compileFullModule(
  code: string,
  config?: CustomCodeConfig
): SimpleAnimationDefinition | null {
  const js = stripTypeScript(code);
  const animDef = executeModule(js);
  if (!animDef || typeof animDef.render !== 'function') return null;

  const defaults = animDef.params?.defaults || {};
  const originalRender = animDef.render;

  // Animation's own config, with optional user overrides from config panel
  const width = config?.width ?? animDef.width ?? 800;
  const height = config?.height ?? animDef.height ?? 600;
  const durationMs = config?.durationMs ?? animDef.durationMs ?? 3000;
  const fps = config?.fps ?? animDef.fps ?? 60;
  const background = config?.background ?? animDef.background ?? '#000000';
  const name = config?.name ?? animDef.name ?? 'Custom Animation';

  return {
    name,
    width,
    height,
    durationMs,
    fps,
    background,
    render: (ctx, opts) => {
      try {
        // Bridge: SimpleAnimationDefinition render → AnimationDefinition render
        // The original render expects a single RenderContext object
        originalRender({
          ctx,
          width: opts.width,
          height: opts.height,
          progress: opts.progress,
          time: opts.progress * durationMs / 1000,
          deltaTime: 1 / fps,
          dpr: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
          params: defaults,
          frame: Math.floor(opts.progress * fps * durationMs / 1000),
        });
      } catch (e) {
        drawError(ctx, opts.width, opts.height, e);
      }
    },
  };
}

/**
 * Execute stripped JavaScript code and extract the `animation` object.
 * Provides stub implementations for param helpers (number, color, folder, etc.)
 * so the schema definition doesn't throw.
 */
function executeModule(js: string): any {
  // Stubs for param helpers that the code imports from '../../runtime/params'
  const stubs = `
    var number = function(o) { return o; };
    var color = function(o) { return o; };
    var string = function(o) { return o; };
    var boolean = function(o) { return o; };
    var select = function(o) { return o; };
    var folder = function(name, schema) { return schema; };
  `;

  const wrapped = stubs + '\n' + js + '\nreturn animation;';
  // eslint-disable-next-line no-new-func
  const factory = new Function(wrapped);
  return factory();
}

// ─── TypeScript Stripping ────────────────────────────────────────────────────
//
// Converts TypeScript to valid JavaScript by removing:
// - import statements
// - export default statements
// - interface / type declaration blocks
// - type annotations on variables, functions, and arrow functions
//
// This is NOT a full TS-to-JS transpiler — it handles the common patterns
// found in canvas animation code (the two example formats above).

function stripTypeScript(code: string): string {
  // Phase 1: Remove import lines and export default
  let result = code
    .replace(/^\s*import\s+.*?;?\s*$/gm, '')
    .replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, '');

  // Phase 2: Remove interface blocks (multi-line with nested braces)
  result = removeInterfaceBlocks(result);

  // Phase 3: Remove type alias declarations (single-line)
  result = result.replace(/^\s*(?:export\s+)?type\s+\w+\s*=.*?;\s*$/gm, '');

  // Phase 4: Strip variable type annotations
  // const foo: SomeType<Generic> = ... → const foo = ...
  result = result.replace(
    /\b(const|let|var)\s+(\w+)\s*:\s*\w+(?:<[^>]*>)?\s*(?==)/g,
    '$1 $2 '
  );

  // Phase 5: Strip function declaration types
  // function name(a: Type, b: Type): ReturnType { → function name(a, b) {
  result = result.replace(
    /function\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*[\w\[\],\s<>|{}()"']+?)?\s*\{/g,
    (_, name, params) => `function ${name}(${cleanParams(params)}) {`
  );

  // Phase 6: Strip arrow function types
  // (a: Type, b: Type): ReturnType => → (a, b) =>
  result = result.replace(
    /\(([^)]*)\)\s*(?::\s*[\w\[\],\s<>|{}()"']+?)?\s*=>/g,
    (_, params) => `(${cleanParams(params)}) =>`
  );

  return result;
}

/**
 * Remove interface blocks (handles multi-line with nested braces).
 * Also removes `type X = { ... }` blocks.
 */
function removeInterfaceBlocks(code: string): string {
  const lines = code.split('\n');
  const output: string[] = [];
  let inBlock = false;
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Detect start of interface block
    if (!inBlock && /^(?:export\s+)?interface\s+\w+/.test(trimmed)) {
      inBlock = true;
      depth = 0;
    }

    if (inBlock) {
      for (const ch of line) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth <= 0 && line.includes('}')) {
        inBlock = false;
      }
      continue; // skip this line
    }

    output.push(line);
  }

  return output.join('\n');
}

/**
 * Split a parameter list string into individual parameters,
 * respecting nested braces/brackets/parens for destructured params.
 */
function splitParams(str: string): string[] {
  const params: string[] = [];
  let current = '';
  let depth = 0;

  for (const ch of str) {
    if (ch === '{' || ch === '[' || ch === '(') depth++;
    if (ch === '}' || ch === ']' || ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      params.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) params.push(current);
  return params;
}

/**
 * Strip type annotations from a parameter list string.
 *
 * Handles:
 * - Simple params: `name: Type` → `name`
 * - Destructured objects: `{ a, b }: Type` → `{ a, b }`
 * - Destructured arrays: `[a, b]: Type` → `[a, b]`
 * - Rest params: `...args: Type[]` → `...args`
 * - Default values: `name: Type = value` → `name = value`
 */
function cleanParams(paramStr: string): string {
  return splitParams(paramStr)
    .map((p) => {
      const t = p.trim();
      if (!t) return '';

      // Destructured object: { a, b, c } or { a, b }: SomeType
      if (t.startsWith('{')) {
        const braceEnd = t.lastIndexOf('}');
        if (braceEnd !== -1) return t.substring(0, braceEnd + 1);
        return t;
      }

      // Destructured array: [a, b] or [a, b]: SomeType
      if (t.startsWith('[')) {
        const bracketEnd = t.lastIndexOf(']');
        if (bracketEnd !== -1) return t.substring(0, bracketEnd + 1);
        return t;
      }

      // Rest param: ...args: Type[]
      if (t.startsWith('...')) {
        const ci = t.indexOf(':');
        return ci !== -1 ? t.substring(0, ci).trim() : t;
      }

      // Simple param: name: Type or name: Type = defaultValue
      const ci = t.indexOf(':');
      if (ci === -1) return t;

      const name = t.substring(0, ci).trim();
      const afterType = t.substring(ci + 1);

      // Check for default value — look for `=` that's not inside a type
      // e.g. `name: Type = value` → keep `name = value`
      // Use depth tracking to skip `=` inside generics like `Map<K=V>`
      let eqIdx = -1;
      let eqDepth = 0;
      for (let i = 0; i < afterType.length; i++) {
        const ch = afterType[i];
        if (ch === '<' || ch === '(' || ch === '{' || ch === '[') eqDepth++;
        if (ch === '>' || ch === ')' || ch === '}' || ch === ']') eqDepth--;
        if (ch === '=' && eqDepth === 0) {
          eqIdx = i;
          break;
        }
      }

      if (eqIdx !== -1) {
        return `${name} ${afterType.substring(eqIdx)}`;
      }

      return name;
    })
    .join(', ');
}

// ─── Error Drawing ───────────────────────────────────────────────────────────

function drawError(ctx: CanvasRenderingContext2D, w: number, h: number, e: unknown) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,0,0,0.15)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#ff4444';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const msg = e instanceof Error ? e.message : String(e);
  // Truncate long messages
  const display = msg.length > 80 ? msg.substring(0, 77) + '...' : msg;
  ctx.fillText(`Runtime error: ${display}`, w / 2, h / 2);
  ctx.restore();
}
