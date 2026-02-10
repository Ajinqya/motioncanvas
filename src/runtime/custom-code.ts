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

// ─── Global Image Cache ──────────────────────────────────────────────────────
// Persistent cache for SVG/image data URLs loaded by animations, keyed by content hash.
// This survives across recompilations so images don't flicker during development.

const globalImageCache = new Map<string, HTMLImageElement>();
const globalImageLoadingPromises = new Map<string, Promise<HTMLImageElement>>();

function getCachedImage(key: string): HTMLImageElement | undefined {
  return globalImageCache.get(key);
}

function cacheImage(key: string, img: HTMLImageElement): void {
  globalImageCache.set(key, img);
}

function getOrCreateImageLoadPromise(key: string, loader: () => Promise<HTMLImageElement>): Promise<HTMLImageElement> {
  const existing = globalImageLoadingPromises.get(key);
  if (existing) return existing;
  
  const promise = loader().then(img => {
    globalImageLoadingPromises.delete(key);
    return img;
  }).catch(err => {
    globalImageLoadingPromises.delete(key);
    throw err;
  });
  
  globalImageLoadingPromises.set(key, promise);
  return promise;
}

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
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:compileCustomCode',message:'entry',data:{codeLength:trimmed.length,hasRecord:trimmed.includes('Record<'),hasMap:trimmed.includes('Map<'),hasArray:trimmed.includes('Array<'),hasAnimDef:trimmed.includes('AnimationDefinition<'),hasSVG:trimmed.includes('<svg'),svgCount:(trimmed.match(/<svg/g)||[]).length},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  const { animation, error } = compileCustomCodeDetailed(trimmed, config);
  if (!animation && error) {
    console.warn('[custom-code] Compilation failed:', error);
  }
  return animation;
}

function compileCustomCodeDetailed(
  trimmedCode: string,
  config?: CustomCodeConfig
): { animation: SimpleAnimationDefinition | null; error: unknown | null } {
  // Be permissive: try both compilation modes. This makes gallery "Copy Code"
  // and "Copy Simple Format" more resilient even if detection misfires or if
  // the module compiler can't handle some syntax.
  let lastError: unknown = null;

  const looksLikeModule =
    isFullAnimationModule(trimmedCode) ||
    /^\s*import\s+/m.test(trimmedCode) ||
    /AnimationDefinition/.test(trimmedCode) ||
    /^\s*export\s+default\b/m.test(trimmedCode);

  const tryFullFirst = looksLikeModule;
  const attempts: Array<() => SimpleAnimationDefinition | null> = tryFullFirst
    ? [() => compileFullModule(trimmedCode, config), () => compileSimpleRenderFunction(trimmedCode, config)]
    : [() => compileSimpleRenderFunction(trimmedCode, config), () => compileFullModule(trimmedCode, config)];

  for (const attempt of attempts) {
    try {
      const res = attempt();
      if (res) return { animation: res, error: null };
    } catch (e) {
      lastError = e;
    }
  }

  return { animation: null, error: lastError };
}

/**
 * Validate code without creating a full animation.
 * Returns an error message string, or null if the code is valid.
 */
export function validateCustomCode(code: string): string | null {
  const trimmed = code.trim();
  if (!trimmed) return 'Code is empty';

  try {
    // Use a default config so validation matches the preview/compiler behavior.
    const { animation, error } = compileCustomCodeDetailed(trimmed, {
      name: 'Custom Code',
      width: 800,
      height: 600,
      durationMs: 3000,
      fps: 60,
      background: '#000000',
    });
    if (animation) return null;
    if (error instanceof Error) return error.message;
    if (typeof error === 'string' && error.trim()) return error;
    return 'Could not compile code';
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
  const durationMs = config?.durationMs || 3000;
  const fps = config?.fps || 60;
  const renderFn = parseRenderFunction(code, { durationMs, fps });
  if (!renderFn) return null;

  return {
    name: config?.name || 'Custom Code',
    width: config?.width || 800,
    height: config?.height || 600,
    durationMs,
    fps,
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
  , timing?: { durationMs: number; fps: number }
): ((ctx: CanvasRenderingContext2D, opts: { width: number; height: number; progress: number }) => void) | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  const durationMs = timing?.durationMs ?? 3000;
  const fps = timing?.fps ?? 60;
  const prelude = `
        var { width, height, progress } = __opts__;
        var durationMs = __durationMs__;
        var fps = __fps__;
        var time = (progress * durationMs) / 1000;
        var deltaTime = 1 / fps;
        var frame = Math.floor(time * fps);
        var dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  `;

  // Format: function render(ctx, { width, height, progress }) { ... }
  const fnDeclMatch = trimmed.match(
    /^function\s+\w+\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*$/
  );
  if (fnDeclMatch) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('ctx', '__opts__', '__durationMs__', '__fps__', `
        ${prelude}
        ${fnDeclMatch[2]}
      `) as any;
      return ((ctx: CanvasRenderingContext2D, opts: { width: number; height: number; progress: number }) =>
        fn(ctx, opts, durationMs, fps)) as any;
    } catch { /* fall through */ }
  }

  // Format: (ctx, { width, height, progress }) => { ... }
  const arrowMatch = trimmed.match(
    /^\(([^)]*)\)\s*=>\s*\{([\s\S]*)\}\s*$/
  );
  if (arrowMatch) {
    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('ctx', '__opts__', '__durationMs__', '__fps__', `
        ${prelude}
        ${arrowMatch[2]}
      `) as any;
      return ((ctx: CanvasRenderingContext2D, opts: { width: number; height: number; progress: number }) =>
        fn(ctx, opts, durationMs, fps)) as any;
    } catch { /* fall through */ }
  }

  // Format: just the body — ctx, width, height, progress are available
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function('ctx', '__opts__', '__durationMs__', '__fps__', `
      ${prelude}
      ${trimmed}
    `) as any;
    return ((ctx: CanvasRenderingContext2D, opts: { width: number; height: number; progress: number }) =>
      fn(ctx, opts, durationMs, fps)) as any;
  } catch (e) {
    console.warn('[custom-code] Failed to compile as function body:', e);
    return null;
  }
}

/**
 * Patch common image loading patterns to use persistent global cache.
 * This prevents flickering when animations are recompiled during development.
 * Uses animation ID for namespacing to avoid key collisions between animations.
 */
function patchImageCache(js: string, animId: string): string {
  let patched = js;
  
  // Create namespaced wrapper for the cache to avoid key collisions
  // Scene 2 uses keys like 'L0', 'L1'; Scene 3 uses 'mainCardImage', etc.
  // Namespace them as 'meeting-notes-scene2:L0', 'meeting-notes-scene3:mainCardImage'
  const cachePrefix = `${animId}:`;
  
  // Replace local Map-based image cache with a namespaced wrapper
  // Pattern: const svgImages = new Map()
  patched = patched.replace(
    /\b(const|let|var)\s+(svgImages|logoImages|imageCache|images)\s*=\s*new\s+Map\s*\(\s*\)/g,
    (_match, decl, varName) => {
      // Create a namespaced proxy Map that prefixes all keys
      return `${decl} ${varName} = {
        set: function(k, v) { __imageCache.set('${cachePrefix}' + k, v); },
        get: function(k) { return __imageCache.get('${cachePrefix}' + k); },
        has: function(k) { return __imageCache.has('${cachePrefix}' + k); },
        delete: function(k) { return __imageCache.delete('${cachePrefix}' + k); },
        clear: function() { /* no-op to avoid clearing other animations */ },
        get size() { 
          let count = 0;
          for (const k of __imageCache.keys()) {
            if (k.startsWith('${cachePrefix}')) count++;
          }
          return count;
        }
      }`;
    }
  );
  
  // DO NOT replace imagesLoaded flag - each animation needs its own guard
  // (Otherwise, if Animation A loads first, Animation B's guard triggers immediately)
  
  // Replace individual image variable initialization: let mainCardImage = null
  // Pattern: let xxxImage = null
  patched = patched.replace(
    /\b(let|var)\s+(\w+Image)\s*=\s*null\s*;/g,
    (_match, decl, varName) => {
      const namespacedKey = `${cachePrefix}${varName}`;
      return `${decl} ${varName} = __imageCache.get('${namespacedKey}') || null;`;
    }
  );
  
  // Patch image assignment callbacks to also store in cache
  // Pattern: mainCardImage = img; → mainCardImage = img; __imageCache.set('scene3:mainCardImage', img);
  patched = patched.replace(
    /(\w+Image)\s*=\s*img\s*;/g,
    (_match, varName) => {
      const namespacedKey = `${cachePrefix}${varName}`;
      return `${varName} = img; __imageCache.set('${namespacedKey}', img);`;
    }
  );
  
  // #region agent log
  try { const _hasMapPattern = /new\s+Map\s*\(/.test(js); const _hasImageVars = /\w+Image\s*=\s*null/.test(js); const _hasLoadedFlag = /imagesLoaded\s*=\s*false/.test(js); const _hasImgAssignment = /\w+Image\s*=\s*img\s*;/.test(js); fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:patchImageCache',message:'image cache patching',data:{hasMapPattern:_hasMapPattern,hasImageVars:_hasImageVars,hasLoadedFlag:_hasLoadedFlag,hasImgAssignment:_hasImgAssignment,animId:animId,cachePrefix:cachePrefix,jsLength:js.length,patchedLength:patched.length},timestamp:Date.now(),hypothesisId:'SVG'})}).catch(()=>{});  } catch(_e) {}
  // #endregion
  
  return patched;
}

// ─── Format B: Full AnimationDefinition Module Compiler ──────────────────────

function compileFullModule(
  code: string,
  config?: CustomCodeConfig
): SimpleAnimationDefinition | null {
  let js = stripTypeScript(code);
  // #region agent log
  try { const _strayGT = (js.match(/\b(const|let|var)\s+\w+\s*>/g) || []).slice(0, 5); const _firstGT = js.indexOf('>'); const _lines = js.split('\n'); const _errLines = _lines.map((l: string, i: number) => l.includes('>') && !l.includes('`') && !l.includes("'") && !l.includes('"') ? `L${i+1}: ${l.substring(0,120)}` : null).filter(Boolean).slice(0, 10); fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:compileFullModule',message:'stripped JS output',data:{jsLength:js.length,codeLength:code.length,strayGT:_strayGT,linesWithGT:_errLines,firstGT:_firstGT,first500:js.substring(0,500)},timestamp:Date.now(),hypothesisId:'A-B-D'})}).catch(()=>{}); } catch(_e) {}
  // #endregion
  
  // Extract animation ID for namespacing (if available)
  const idMatch = js.match(/id\s*:\s*['"]([^'"]+)['"]/);
  const animId = idMatch ? idMatch[1] : 'unknown';
  
  // Patch image cache to use persistent global storage (fixes flickering on recompilation)
  js = patchImageCache(js, animId);
  
  const animDef = executeModule(js);
  if (!animDef || typeof animDef.render !== 'function') return null;

  const defaults = animDef.params?.defaults || {};
  const schema = animDef.params?.schema;
  const originalRender = animDef.render;

  // Animation's own config, with optional user overrides from config panel
  const width = config?.width ?? animDef.width ?? 800;
  const height = config?.height ?? animDef.height ?? 600;
  const durationMs = config?.durationMs ?? animDef.durationMs ?? 3000;
  const fps = config?.fps ?? animDef.fps ?? 60;
  const background = config?.background ?? animDef.background ?? '#000000';
  const name = config?.name ?? animDef.name ?? 'Custom Animation';

  // Track if setup() has been called (only call once)
  let setupCalled = false;

  return {
    name,
    width,
    height,
    durationMs,
    fps,
    background,
    ...(schema && typeof schema === 'object' && Object.keys(schema).length > 0
      ? { params: { defaults, schema } }
      : {}),
    render: (ctxOrContext: CanvasRenderingContext2D | import('./types').RenderContext, opts?: { width: number; height: number; progress: number }) => {
      // Support both call signatures:
      // - Full format (1 arg): first param is RenderContext, e.g. from Player when definition has id
      // - Simple format (2 args): ctx + { width, height, progress }, e.g. from Player for simple animations
      const renderContext: import('./types').RenderContext = opts === undefined
        ? (ctxOrContext as import('./types').RenderContext)
        : {
            ctx: ctxOrContext as CanvasRenderingContext2D,
            width: opts.width,
            height: opts.height,
            progress: opts.progress,
            time: opts.progress * durationMs / 1000,
            deltaTime: 1 / fps,
            dpr: typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1,
            params: defaults,
            frame: Math.floor(opts.progress * fps * durationMs / 1000),
          };

      try {
        // Call setup() on first render (in browser context with DOM APIs)
        if (!setupCalled && typeof animDef.setup === 'function') {
          setupCalled = true;
          try {
            animDef.setup();
            // #region agent log
            const _cacheSize = globalImageCache.size; const _keys = Array.from(globalImageCache.keys()).slice(0, 5); fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:render:setup',message:'setup() called in render context',data:{hasImage:typeof Image !== 'undefined',hasBlob:typeof Blob !== 'undefined',cacheSize:_cacheSize,cacheKeys:_keys},timestamp:Date.now(),hypothesisId:'SVG'})}).catch(()=>{});
            // #endregion
          } catch (e) {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:render:setup:error',message:'setup() failed in render',data:{error:(e as any)?.message,stack:(e as any)?.stack},timestamp:Date.now(),hypothesisId:'SVG'})}).catch(()=>{});
            // #endregion
          }
        }

        originalRender(renderContext);
      } catch (e) {
        const w = renderContext.width ?? width;
        const h = renderContext.height ?? height;
        drawError(renderContext.ctx, w, h, e);
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

  // Inject persistent image cache helpers into the animation's scope
  // These will be called by the animation's setup() when it runs in the browser context
  const cacheHelpers = `
    var __imageCache = arguments[0];
    var __getCachedImage = arguments[1];
    var __cacheImage = arguments[2];
    var __loadImage = arguments[3];
  `;

  const wrapped = stubs + '\n' + cacheHelpers + '\n' + js + '\nreturn animation;';
  // eslint-disable-next-line no-new-func
  try {
    const factory = new Function(wrapped);
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:executeModule',message:'new Function succeeded',data:{wrappedLength:wrapped.length},timestamp:Date.now(),hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    // Pass cache helpers as arguments
    return factory(globalImageCache, getCachedImage, cacheImage, getOrCreateImageLoadPromise);
  } catch (e: any) {
    // #region agent log
    fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:executeModule:error',message:'new Function FAILED',data:{error:e?.message,jsSnippetAroundError:js.substring(0,2000)},timestamp:Date.now(),hypothesisId:'A-B-D-E'})}).catch(()=>{});
    // #endregion
    throw e;
  }
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
    .replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, '')
    .replace(/\bexport\s+default\s+\w+\s*;?/g, '');

  // Remove other export forms that are valid TS but invalid in our Function() wrapper
  // export const foo = ...; / export function foo() { ... }
  result = result
    .replace(/^\s*export\s+(?=(const|let|var|function|class)\b)/gm, '')
    // export { a, b as c };
    .replace(/^\s*export\s*\{[^}]*\}\s*;?\s*$/gm, '');

  // Phase 2: Remove interface blocks (multi-line with nested braces)
  result = removeInterfaceBlocks(result);

  // Phase 3: Remove type alias declarations (single-line)
  result = result.replace(/^\s*(?:export\s+)?type\s+\w+\s*=.*?;\s*$/gm, '');

  // Phase 4: Strip variable type annotations
  // const foo: SomeType<Generic> = ... → const foo = ...
  // let foo: number; → let foo;
  // (Not a full TS parser — handles common patterns found in our gallery code.)
  // Handle function-type annotations: const f: (a: number) => number = ...
  result = result.replace(
    /\b(const|let|var)\s+(\w+)\s*:\s*\(((?:[^()]|\([^()]*\))*)\)\s*=>\s*[\w\[\],\s<>|{}()"']+\s*(?==)/g,
    '$1 $2 '
  );
  // Handle generic types FIRST (before object/array patterns to avoid conflicts)
  // const x: Record<string, string> = ... or Array<...> = ...
  // Use a function-based replacement to handle nested brackets correctly
  // Match: const/let/var name : TypeName<...> = 
  const genericPattern = /\b(const|let|var)\s+(\w+)\s*:\s*[\w.]+\s*</g;
  let lastIndex = 0;
  const parts: string[] = [];
  let match;
  
  while ((match = genericPattern.exec(result)) !== null) {
    // Add everything before this match
    if (match.index > lastIndex) {
      parts.push(result.substring(lastIndex, match.index));
    }
    
    const decl = match[1];
    const name = match[2];
    const openBracketPos = match.index + match[0].length - 1;
    
    // Find the matching > by counting brackets
    let depth = 1;
    let pos = openBracketPos + 1;
    let foundMatch = false;
    
    while (pos < result.length && depth > 0) {
      const char = result[pos];
      if (char === '<') depth++;
      else if (char === '>') {
        depth--;
        if (depth === 0) {
          // Found matching >, check if followed by = (with optional whitespace)
          const afterClose = pos + 1;
          // Look ahead for = (allowing whitespace/newlines)
          let checkPos = afterClose;
          while (checkPos < result.length && /\s/.test(result[checkPos])) {
            checkPos++;
          }
          if (checkPos < result.length && result[checkPos] === '=') {
            // Valid generic type annotation - strip it
            parts.push(decl + ' ' + name + ' ');
            lastIndex = afterClose;
            foundMatch = true;
            break;
          }
        }
      } else if (char === '=' && depth > 0) {
        // Hit = before closing, not a valid generic
        break;
      }
      pos++;
    }
    
    if (!foundMatch) {
      // Not a valid generic or couldn't find match, keep original text
      // Add the matched portion (from match.index to end of match) to preserve it
      parts.push(result.substring(match.index, match.index + match[0].length));
      lastIndex = match.index + match[0].length;
      genericPattern.lastIndex = lastIndex;
    } else {
      // Successfully replaced, continue from after the replacement
      genericPattern.lastIndex = lastIndex;
    }
  }
  
  // Add remaining part
  if (lastIndex < result.length) {
    parts.push(result.substring(lastIndex));
  }
  result = parts.join('');
  // #region agent log
  try { const _constGT = (result.match(/\bconst\s+\w+[^=\n]{0,30}>/g) || []).slice(0, 5); const _letGT = (result.match(/\blet\s+\w+[^=\n]{0,30}>/g) || []).slice(0, 5); fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:stripTypeScript:afterGenericStrip',message:'after generic bracket handling',data:{resultLength:result.length,constWithGT:_constGT,letWithGT:_letGT,partsCount:parts.length},timestamp:Date.now(),hypothesisId:'A-D'})}).catch(()=>{}); } catch(_e) {}
  // #endregion
  
  // Handle object-type annotations: const x: { a: number; b: string }[] = ...
  // (After generics to avoid conflicts)
  result = result.replace(
    /\b(const|let|var)\s+(\w+)\s*:\s*\{[\s\S]*?\}\s*(?:\[\])?\s*(?==)/g,
    '$1 $2 '
  );
  // Handle array type annotations: const x: Type[] = ...
  result = result.replace(
    /\b(const|let|var)\s+(\w+)\s*:\s*\w+\[\]\s*(?==)/g,
    '$1 $2 '
  );
  // Cleanup: Remove any stray > characters that might have been left behind
  // Pattern: const/let/var name > = (stray > before =)
  result = result.replace(
    /\b(const|let|var)\s+(\w+)\s*>\s*(?==)/g,
    '$1 $2 '
  );
  // Pattern: const/let/var name : > = (stray > after :)
  result = result.replace(
    /\b(const|let|var)\s+(\w+)\s*:\s*>\s*(?==)/g,
    '$1 $2 '
  );
  
  // General fallback for any remaining type annotations (must come after specific patterns)
  // Exclude patterns that contain < to avoid matching partial generics
  result = result.replace(
    /\b(const|let|var)\s+(\w+)\s*:\s*[^=<]+?\s*(?==)/g,
    '$1 $2 '
  );
  // Handle declarations without initializers - but exclude generics (they're handled separately)
  result = result.replace(
    /\b(const|let|var)\s+(\w+)\s*:\s*[^<;]+?\s*(?=[;,])/g,
    '$1 $2 '
  );
  // TS allows `const x: Type;` but JS doesn't. Downgrade to `let x;`.
  // Handle array types first: const x: Type[]; → let x;
  result = result.replace(
    /\bconst\s+(\w+)\s*:\s*\w+\[\]\s*;/g,
    'let $1;'
  );
  // Handle generic types: const x: Record<string, string>; → let x;
  result = result.replace(
    /\bconst\s+(\w+)\s*:\s*[\w.]+\s*<[^>]*>\s*;/g,
    'let $1;'
  );
  // General fallback for remaining type annotations (exclude generics)
  result = result.replace(
    /\bconst\s+(\w+)\s*:\s*[^<;]+\s*;/g,
    'let $1;'
  );
  // TS allows `const x: { ... };` but JS doesn't. Downgrade to `let x;`.
  result = result.replace(
    /\bconst\s+(\w+)\s*:\s*\{[\s\S]*?\}\s*(?:\[\])?\s*;/g,
    'let $1;'
  );
  // Also handle function-type declarations without initializer:
  // const fn: (a: number) => void; → let fn;
  result = result.replace(
    /\bconst\s+(\w+)\s*:\s*\(((?:[^()]|\([^()]*\))*)\)\s*=>\s*[\w\[\],\s<>|{}()"']+\s*;/g,
    'let $1;'
  );

  // Phase 5: Strip function declaration types
  // function name(a: Type, b: Type): ReturnType { → function name(a, b) {
  // Uses bracket-counting to handle complex return types like Record<string, { x: number }>.
  {
    const fnReturnPattern = /function\s+(\w+)\s*\(((?:[^()]|\([^()]*\))*)\)\s*:\s*/g;
    let fnMatch;
    const fnParts: string[] = [];
    let fnLastIndex = 0;

    while ((fnMatch = fnReturnPattern.exec(result)) !== null) {
      const name = fnMatch[1];
      const params = fnMatch[2];
      const afterColon = fnMatch.index + fnMatch[0].length;

      // Count brackets to find the function body opening {
      let angleDepth = 0, curlyDepth = 0, squareDepth = 0, parenDepth = 0;
      let pos = afterColon;
      let foundBody = false;
      let inTemplateLiteral = false;

      while (pos < result.length) {
        const ch = result[pos];
        // Skip template literal content
        if (ch === '`') { inTemplateLiteral = !inTemplateLiteral; pos++; continue; }
        if (inTemplateLiteral) { pos++; continue; }

        if (ch === '<') angleDepth++;
        else if (ch === '>' && angleDepth > 0) angleDepth--;
        else if (ch === '(') parenDepth++;
        else if (ch === ')' && parenDepth > 0) parenDepth--;
        else if (ch === '[') squareDepth++;
        else if (ch === ']' && squareDepth > 0) squareDepth--;
        else if (ch === '{') {
          if (angleDepth === 0 && parenDepth === 0 && squareDepth === 0 && curlyDepth === 0) {
            foundBody = true;
            break;
          }
          curlyDepth++;
        }
        else if (ch === '}') {
          if (curlyDepth > 0) curlyDepth--;
        }
        pos++;
      }

      if (foundBody) {
        fnParts.push(result.substring(fnLastIndex, fnMatch.index));
        fnParts.push(`function ${name}(${cleanParams(params)}) `);
        fnLastIndex = pos; // pos points at the body-opening {
        fnReturnPattern.lastIndex = pos;
      }
    }

    if (fnParts.length > 0) {
      fnParts.push(result.substring(fnLastIndex));
      result = fnParts.join('');
    }
  }
  // Also handle functions without return types but with param types
  result = result.replace(
    /function\s+(\w+)\s*\(((?:[^()]|\([^()]*\))*)\)\s*\{/g,
    (_, name, params) => `function ${name}(${cleanParams(params)}) {`
  );

  // #region agent log
  try { const _fnLines = result.split('\n').filter((l: string) => /function\s+\w+/.test(l)).map((l: string) => l.substring(0, 120)).slice(0, 10); fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:stripTypeScript:afterPhase5',message:'after function type stripping',data:{fnLines:_fnLines,resultLength:result.length},timestamp:Date.now(),hypothesisId:'B-E'})}).catch(()=>{}); } catch(_e) {}
  // #endregion
  // Phase 6: Strip arrow function types
  // (a: Type, b: Type): ReturnType => → (a, b) =>
  // Uses bracket-counting to handle complex return types like Record<string, { x: number }>.
  {
    const arrowReturnPattern = /\(((?:[^()]|\([^()]*\))*)\)\s*:\s*/g;
    let arrowMatch;
    const arrowParts: string[] = [];
    let arrowLastIndex = 0;

    while ((arrowMatch = arrowReturnPattern.exec(result)) !== null) {
      const params = arrowMatch[1];
      const afterColon = arrowMatch.index + arrowMatch[0].length;

      // Count brackets to find the => token
      let angleDepth = 0, curlyDepth = 0, squareDepth = 0, parenDepth = 0;
      let pos = afterColon;
      let foundArrow = false;
      let inTemplateLiteral = false;

      while (pos < result.length - 1) {
        const ch = result[pos];
        if (ch === '`') { inTemplateLiteral = !inTemplateLiteral; pos++; continue; }
        if (inTemplateLiteral) { pos++; continue; }

        if (ch === '<') angleDepth++;
        else if (ch === '>' && angleDepth > 0) angleDepth--;
        else if (ch === '(') parenDepth++;
        else if (ch === ')' && parenDepth > 0) parenDepth--;
        else if (ch === '[') squareDepth++;
        else if (ch === ']' && squareDepth > 0) squareDepth--;
        else if (ch === '{') curlyDepth++;
        else if (ch === '}') { if (curlyDepth > 0) curlyDepth--; }
        else if (ch === '=' && result[pos + 1] === '>' &&
                 angleDepth === 0 && curlyDepth === 0 && squareDepth === 0 && parenDepth === 0) {
          foundArrow = true;
          break;
        }
        pos++;
      }

      if (foundArrow) {
        arrowParts.push(result.substring(arrowLastIndex, arrowMatch.index));
        arrowParts.push(`(${cleanParams(params)}) `);
        arrowLastIndex = pos; // pos points at the =>, keep it
        arrowReturnPattern.lastIndex = pos;
      }
    }

    if (arrowParts.length > 0) {
      arrowParts.push(result.substring(arrowLastIndex));
      result = arrowParts.join('');
    }
  }
  // Also handle arrows without return types but with param types
  result = result.replace(
    /\(((?:[^()]|\([^()]*\))*)\)\s*=>/g,
    (_, params) => `(${cleanParams(params)}) =>`
  );

  // Phase 6b: Strip single-param arrow function types (no parens)
  // t: number => → t =>
  result = result.replace(
    /\b([A-Za-z_]\w*)\s*:\s*[\w\[\],\s<>|{}()"']+?\s*=>/g,
    (_, name) => `${name} =>`
  );

  // Phase 7: Remove non-null assertion operator (postfix `!`)
  // Examples: foo!.bar → foo.bar, getContext('2d')!; → getContext('2d');
  result = result.replace(
    /([\w\)\]\}])!\s*(?=[\.\;\,\)\]\}\[\(])/g,
    '$1'
  );

  // Phase 8: Remove common `as Type` assertions
  // Examples: `foo as any`, `bar as const`, `baz as SomeType`
  result = result.replace(
    /\s+as\s+(?:const|any|unknown|typeof\s+[\w.]+|keyof\s+[\w.]+|[\w.]+(?:<[^>]*>)?)/g,
    ''
  );

  // #region agent log
  try { const _lines = result.split('\n'); const _problematic = _lines.map((l: string, i: number) => { const stripped = l.replace(/`[^`]*`/g, '').replace(/'[^']*'/g, '').replace(/"[^"]*"/g, ''); return stripped.includes('>') ? `L${i+1}: ${l.substring(0, 150)}` : null; }).filter(Boolean).slice(0, 15); fetch('http://127.0.0.1:7244/ingest/e9ceb641-0cf4-461d-966d-fe697b328db3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'custom-code.ts:stripTypeScript:final',message:'final stripped output',data:{resultLength:result.length,linesWithGTOutsideStrings:_problematic},timestamp:Date.now(),hypothesisId:'A-B-D-E'})}).catch(()=>{}); } catch(_e) {}
  // #endregion

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
        // Skip the `=` in function types like `() => void`
        if (ch === '=' && afterType[i + 1] === '>') continue;
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
