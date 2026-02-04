import { useState, useEffect } from 'react';
import type { 
  AnimationDefinition, 
  SimpleAnimationDefinition,
  AnyAnimationDefinition,
  AnimationEntry, 
  AnimationMeta 
} from '../runtime/types';

// Use Vite's import.meta.glob to auto-discover animations
// Each animation folder should have an index.ts and optionally a meta.json
// Supports both full AnimationDefinition and SimpleAnimationDefinition formats
const animationModules = import.meta.glob<{ 
  default?: AnimationDefinition;
  simpleCircle?: SimpleAnimationDefinition;
  [key: string]: any;
}>(
  './**/index.ts',
  { eager: true }
);

const metaModules = import.meta.glob<AnimationMeta>(
  './**/meta.json',
  { eager: true }
);

const sourceModules = import.meta.glob<string>(
  './**/index.ts',
  { eager: true, query: '?raw', import: 'default' }
);

// Build the registry
const registry: Map<string, AnimationEntry> = new Map();

for (const [path, module] of Object.entries(animationModules)) {
  // Find any animation definition in the module (default export or named exports)
  let definition: AnyAnimationDefinition | undefined;
  
  // Try default export first
  if (module.default) {
    definition = module.default;
  } else {
    // Try to find any named export that looks like an animation
    for (const [, value] of Object.entries(module)) {
      if (value && typeof value === 'object' && 'render' in value) {
        definition = value as AnyAnimationDefinition;
        break;
      }
    }
  }
  
  if (!definition) continue;
  
  // For simple animations, derive an ID from the path or name
  const id = ('id' in definition && definition.id) 
    ? definition.id 
    : ('name' in definition && definition.name) 
      ? definition.name.toLowerCase().replace(/\s+/g, '-')
      : path.split('/').slice(-2, -1)[0]; // folder name

  // Find corresponding meta.json
  const metaPath = path.replace('/index.ts', '/meta.json');
  const meta = metaModules[metaPath] as AnimationMeta | undefined;

  // Find source code
  const source = sourceModules[path] as string | undefined;

  registry.set(id, {
    definition,
    meta,
    source,
  });
}

/**
 * Get all registered animations
 */
export function getAllAnimations(): AnimationEntry[] {
  return Array.from(registry.values());
}

/**
 * Get animation by ID
 */
export function getAnimationById(id: string): AnimationEntry | undefined {
  return registry.get(id);
}

/**
 * React hook to get all animations (triggers re-render on HMR)
 */
export function useAnimationRegistry(): AnimationEntry[] {
  const [animations, setAnimations] = useState<AnimationEntry[]>(() =>
    getAllAnimations()
  );

  useEffect(() => {
    // Re-fetch on mount (for HMR)
    setAnimations(getAllAnimations());
  }, []);

  return animations;
}
