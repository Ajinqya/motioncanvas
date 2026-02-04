/**
 * Core types for the canvas animation runtime
 */

/** Context passed to each render frame */
export interface RenderContext<P = Record<string, unknown>> {
  /** The 2D canvas rendering context */
  ctx: CanvasRenderingContext2D;
  /** Current time in seconds since animation start */
  time: number;
  /** Animation progress from 0 to 1 (preferred for simple animations) */
  progress: number;
  /** Delta time since last frame in seconds */
  deltaTime: number;
  /** Canvas width in CSS pixels */
  width: number;
  /** Canvas height in CSS pixels */
  height: number;
  /** Device pixel ratio for HiDPI rendering */
  dpr: number;
  /** Current parameter values (empty object if no params defined) */
  params: P;
  /** Frame number (0-indexed) */
  frame: number;
}

/** Simple render function format - progress-based (0 to 1) */
export type SimpleRenderFunction = (
  ctx: CanvasRenderingContext2D,
  options: {
    width: number;
    height: number;
    progress: number;
  }
) => void;

/** Simple animation definition - minimal, portable format */
export interface SimpleAnimationDefinition {
  /** Optional animation name */
  name?: string;
  /** Target frames per second (default: 60) */
  fps?: number;
  /** Animation duration in milliseconds (default: 3000) */
  durationMs?: number;
  /** Canvas width (default: 800) */
  width?: number;
  /** Canvas height (default: 600) */
  height?: number;
  /** Background color (default: transparent) */
  background?: string;
  /** Simple render function */
  render: SimpleRenderFunction;
}

/** Animation definition that every animation must export */
export interface AnimationDefinition<P = Record<string, unknown>> {
  /** Unique identifier for the animation */
  id: string;
  /** Display name */
  name: string;
  /** Target frames per second (default: 60) */
  fps?: number;
  /** Animation duration in milliseconds (undefined = infinite loop) */
  durationMs?: number;
  /** Background color (default: transparent) */
  background?: string;
  /** Canvas width (default: 800) */
  width?: number;
  /** Canvas height (default: 600) */
  height?: number;
  /** Parameter configuration */
  params: {
    /** Default parameter values */
    defaults: P;
    /** Schema for generating UI controls */
    schema: ParamSchema;
  };
  /** Called once when animation starts */
  setup?: (ctx: RenderContext<P>) => void;
  /** Called every frame to render the animation */
  render: (ctx: RenderContext<P>) => void;
}

/** 
 * Schema types for parameter UI generation.
 * Uses Leva-compatible format directly.
 */
export type ParamSchema = Record<string, unknown>;

/** Union type supporting both animation formats */
export type AnyAnimationDefinition<P = any> = 
  | AnimationDefinition<P> 
  | SimpleAnimationDefinition;

/** Type guard to check if animation is simple format (uses SimpleRenderFunction signature) */
export function isSimpleAnimation(
  animation: AnyAnimationDefinition
): animation is SimpleAnimationDefinition {
  // Simple animations don't have 'id' field (required in AnimationDefinition)
  return typeof animation.render === 'function' && 
    !('id' in animation);
}

/** Registered animation entry with raw source code */
export interface AnimationEntry<P = Record<string, unknown>> {
  definition: AnyAnimationDefinition<P>;
  /** Raw source code for export */
  source?: string;
  /** Metadata from meta.json */
  meta?: AnimationMeta;
}

/** Metadata stored alongside each animation */
export interface AnimationMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  source: {
    type: 'figma' | 'screenshot' | 'none';
    figmaUrl?: string;
    filePath?: string;
    notes?: string;
  };
  /** Original prompt/instructions used to create this animation */
  prompt: string;
  /** Optional notes about the parameters */
  paramsNotes?: string;
  /** Tags for filtering/searching */
  tags: string[];
}

/**
 * Convert a full AnimationDefinition to a SimpleAnimationDefinition
 * by baking in current parameter values
 */
export function toSimpleAnimation<P = Record<string, unknown>>(
  animation: AnimationDefinition<P>,
  currentParams?: Partial<P>
): SimpleAnimationDefinition {
  const params = { ...animation.params.defaults, ...currentParams };
  
  return {
    name: animation.name,
    fps: animation.fps,
    durationMs: animation.durationMs,
    width: animation.width,
    height: animation.height,
    background: animation.background,
    render: (ctx, { width, height, progress }) => {
      // Convert progress (0-1) to time in seconds
      const durationSec = animation.durationMs 
        ? animation.durationMs / 1000 
        : 1;
      const time = progress * durationSec;
      
      // Create a render context with the baked params
      const renderContext: RenderContext<P> = {
        ctx,
        time,
        progress,
        deltaTime: 0,
        width,
        height,
        dpr: 1,
        params: params as P,
        frame: Math.floor(time * (animation.fps ?? 60)),
      };
      
      animation.render(renderContext);
    },
  };
}

/**
 * Generate a standalone code string for a SimpleAnimationDefinition
 * Outputs in JSON format for external canvas animation code editor
 */
export function generateSimpleAnimationCode(animation: SimpleAnimationDefinition): string {
  const { render, name, fps, durationMs, width, height } = animation;
  
  const renderString = render.toString();
  
  return `// ${name || 'Animation'}
// fps: ${fps ?? 60}, duration: ${durationMs ?? 3000}ms, size: ${width ?? 800}x${height ?? 600}

${renderString}`;
}

/**
 * Generate code in the external canvas animation code editor format
 * Returns a render function: function render(ctx, { width, height, progress }) { ... }
 */
export function generateExternalEditorCode<P = Record<string, unknown>>(
  animation: AnimationDefinition<P>,
  currentParams?: Partial<P>,
  _sourceCode?: string
): string {
  // Use the current params directly (they should already have all values from the UI)
  const params = { ...animation.params.defaults, ...currentParams };
  
  // Generate param declarations (indented for inside function)
  const paramLines: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // Escape single quotes in string values
      const escaped = String(value).replace(/'/g, "\\'");
      paramLines.push(`  const ${key} = '${escaped}';`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      paramLines.push(`  const ${key} = ${value};`);
    } else if (Array.isArray(value)) {
      paramLines.push(`  const ${key} = ${JSON.stringify(value)};`);
    } else if (typeof value === 'object' && value !== null) {
      paramLines.push(`  const ${key} = ${JSON.stringify(value)};`);
    }
  }
  
  // Extract external dependencies from source code
  let externalDeps = '';
  if (_sourceCode) {
    // Find where the animation definition starts
    const animationMatch = _sourceCode.match(/const\s+animation\s*[=:]/);
    if (animationMatch && animationMatch.index) {
      const beforeAnimation = _sourceCode.substring(0, animationMatch.index);
      
      // Find all const declarations (not imports, interfaces, or types)
      const declarations: string[] = [];
      
      // Split into potential declaration blocks
      // Look for lines starting with "const " that aren't inside the animation
      let currentDecl = '';
      let depth = 0;
      let inDeclaration = false;
      
      for (const line of beforeAnimation.split('\n')) {
        const trimmed = line.trim();
        
        // Skip imports, comments, interfaces, types, empty lines
        if (!inDeclaration) {
          if (trimmed.startsWith('import ') ||
              trimmed.startsWith('//') ||
              trimmed.startsWith('/*') ||
              trimmed.startsWith('*') ||
              trimmed.startsWith('interface ') ||
              trimmed.startsWith('type ') ||
              trimmed === '' ||
              trimmed.startsWith('export ')) {
            continue;
          }
          
          // Start of a const or function declaration
          if (trimmed.startsWith('const ') || trimmed.startsWith('function ')) {
            inDeclaration = true;
            currentDecl = line;
            depth = 0;
            // Count brackets on this line
            for (const c of line) {
              if (c === '{' || c === '[' || c === '(') depth++;
              if (c === '}' || c === ']' || c === ')') depth--;
            }
            // Check if declaration ends on same line
            if (depth === 0 && (trimmed.endsWith(';') || trimmed.endsWith('}'))) {
              declarations.push(currentDecl);
              currentDecl = '';
              inDeclaration = false;
            }
          }
        } else {
          // Continue collecting declaration
          currentDecl += '\n' + line;
          for (const c of line) {
            if (c === '{' || c === '[' || c === '(') depth++;
            if (c === '}' || c === ']' || c === ')') depth--;
          }
          // Check if declaration ends
          if (depth === 0 && (trimmed.endsWith(';') || trimmed.endsWith('];') || trimmed.endsWith('};'))) {
            declarations.push(currentDecl);
            currentDecl = '';
            inDeclaration = false;
          }
        }
      }
      
      // Clean up TypeScript annotations from declarations
      if (declarations.length > 0) {
        externalDeps = declarations
          .map(decl => {
            return decl
              // Remove type annotations after variable names: const x: Type = -> const x =
              .replace(/const\s+(\w+)\s*:\s*[^=]+=/, 'const $1 =')
              // Remove return type annotations: (t: number): number => -> (t) =>
              .replace(/\(([^)]*)\)\s*:\s*\w+\s*=>/g, '($1) =>')
              // Remove param type annotations: (t: number) -> (t)
              .replace(/(\w+)\s*:\s*\w+/g, '$1')
              // Clean up extra spaces
              .replace(/\(\s+/g, '(')
              .replace(/\s+\)/g, ')');
          })
          .join('\n\n');
      }
    }
  }
  
  // Extract the render function body
  const renderFn = animation.render;
  let renderBody = renderFn.toString();
  
  // Try to extract just the function body
  const bodyMatch = renderBody.match(/\)\s*(?:=>)?\s*\{([\s\S]*)\}$/);
  if (bodyMatch) {
    renderBody = bodyMatch[1];
    
    // Remove the params destructuring - handles both single and multi-line
    renderBody = renderBody.replace(/^\s*const\s*\{[\s\S]+?\}\s*=\s*params\s*;?\s*/m, '');
    
    // Clean up leading/trailing whitespace while preserving internal formatting
    renderBody = renderBody.trim();
  }
  
  // Indent the body properly
  const indentedBody = renderBody
    .split('\n')
    .map(line => '  ' + line)
    .join('\n');
  
  // Indent external dependencies
  const indentedDeps = externalDeps
    ? externalDeps.split('\n').map(line => '  ' + line).join('\n')
    : '';
  
  // Build the render function
  const lines = [
    'function render(ctx, { width, height, progress }) {',
    '  // Parameters',
    ...paramLines,
  ];
  
  // Add external dependencies if any
  if (indentedDeps) {
    lines.push('');
    lines.push('  // Data and helpers');
    lines.push(indentedDeps);
  }
  
  lines.push('');
  lines.push(indentedBody);
  lines.push('}');
  
  return lines.join('\n');
}
