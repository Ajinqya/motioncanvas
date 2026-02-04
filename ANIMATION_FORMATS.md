# Animation Formats

This project supports **two animation formats** to suit different use cases:

## 1. Simple Format (Portable & Minimal)

Perfect for: Sharing, exporting, embedding in other projects

```typescript
function render(ctx, { width, height, progress }) {
  // Clear background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, width, height);
  
  // Draw animated element
  ctx.fillStyle = '#ec4899';
  ctx.beginPath();
  ctx.arc(width/2, height/2, 50 * progress, 0, Math.PI * 2);
  ctx.fill();
}
```

### Simple Format Structure

```typescript
interface SimpleAnimationDefinition {
  name?: string;
  fps?: number;           // default: 60
  durationMs?: number;    // default: 3000
  width?: number;         // default: 800
  height?: number;        // default: 600
  background?: string;    // default: transparent
  render: (ctx, { width, height, progress }) => void;
}
```

**Key Features:**
- `progress`: 0 to 1 (0% to 100% of animation)
- No parameters - values are baked in
- Standalone, copy-paste ready
- Easy to share and export

**Example:**

```typescript
export const myAnimation: SimpleAnimationDefinition = {
  name: 'Growing Circle',
  fps: 60,
  durationMs: 2000,
  width: 600,
  height: 400,
  background: '#000000',
  
  render: (ctx, { width, height, progress }) => {
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(width/2, height/2, 100 * progress, 0, Math.PI * 2);
    ctx.fill();
  },
};
```

---

## 2. Full Format (Feature-Rich)

Perfect for: Internal use, parameter-driven animations, complex projects

```typescript
export const myAnimation: AnimationDefinition<MyParams> = {
  id: 'my-animation',
  name: 'My Animation',
  fps: 60,
  durationMs: 3000,
  width: 800,
  height: 600,
  background: '#000000',
  
  params: {
    defaults: {
      color: '#ec4899',
      size: 100,
      speed: 1.0,
    },
    schema: {
      color: color({ value: '#ec4899' }),
      size: number({ value: 100, min: 10, max: 200, step: 10 }),
      speed: number({ value: 1.0, min: 0.1, max: 3, step: 0.1 }),
    },
  },
  
  setup(ctx) {
    // Optional: Initialize resources, fonts, etc.
  },
  
  render({ ctx, time, width, height, params }) {
    // time: seconds since start
    // params: current parameter values
    const radius = params.size * Math.sin(time * params.speed);
    
    ctx.fillStyle = params.color;
    ctx.beginPath();
    ctx.arc(width/2, height/2, radius, 0, Math.PI * 2);
    ctx.fill();
  },
};
```

### Full Format Structure

```typescript
interface AnimationDefinition<P> {
  id: string;
  name: string;
  fps?: number;
  durationMs?: number;
  width?: number;
  height?: number;
  background?: string;
  params: {
    defaults: P;
    schema: ParamSchema;
  };
  setup?: (ctx: RenderContext<P>) => void;
  render: (ctx: RenderContext<P>) => void;
}

interface RenderContext<P> {
  ctx: CanvasRenderingContext2D;
  time: number;        // seconds since animation start
  deltaTime: number;   // seconds since last frame
  width: number;
  height: number;
  dpr: number;         // device pixel ratio
  params: P;           // current parameter values
  frame: number;       // frame number (0-indexed)
}
```

**Key Features:**
- Dynamic parameters with UI controls
- Time-based animation (seconds)
- Setup hook for initialization
- Full render context with frame info
- Metadata and tagging support

---

## Converting Between Formats

### Export to Simple Format

Use the **"Copy Simple Format"** button in the Export panel to convert any full-format animation to simple format with current parameter values baked in.

### Programmatic Conversion

```typescript
import { toSimpleAnimation, generateSimpleAnimationCode } from './runtime/types';

// Convert to simple format
const simpleAnim = toSimpleAnimation(fullAnimation, currentParams);

// Generate standalone code
const code = generateSimpleAnimationCode(simpleAnim);
console.log(code); // Copy-paste ready!
```

---

## When to Use Each Format

### Use Simple Format When:
- ✅ Sharing animations with others
- ✅ Embedding in external projects
- ✅ Creating quick prototypes
- ✅ Exporting for use outside this tool
- ✅ You don't need parameter controls

### Use Full Format When:
- ✅ Building animations for this project
- ✅ You need parameter controls
- ✅ Time-based animations are more natural
- ✅ You need setup/initialization logic
- ✅ You want metadata and tagging

---

## Example: Battery Animation

### Simple Format Export
```typescript
function render(ctx, { width, height, progress }) {
  const batteryWidth = 300;
  const batteryHeight = 120;
  const batteryX = (width - batteryWidth) / 2;
  const batteryY = (height - batteryHeight) / 2;
  
  // Draw battery outline
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.strokeRect(batteryX, batteryY, batteryWidth, batteryHeight);
  
  // Draw fill based on progress
  ctx.fillStyle = '#2EB57D';
  ctx.fillRect(
    batteryX + 8, 
    batteryY + 8, 
    (batteryWidth - 16) * progress, 
    batteryHeight - 16
  );
}
```

### Full Format (Internal)
```typescript
export const battery: AnimationDefinition<BatteryParams> = {
  id: 'battery',
  name: 'Battery Animation',
  // ... full config with params
  render({ ctx, time, width, height, params }) {
    const progress = easeInOutCubic(time / params.fillDuration);
    // ... render with parameters
  },
};
```

---

## Tips

1. **Start with Simple** for quick experiments, then upgrade to Full if you need parameters
2. **Export Simple** when sharing - it's self-contained and portable
3. **Use Full** for project animations that benefit from parameter controls
4. The player automatically detects and handles both formats seamlessly

---

## See Also

- `/src/animations/simple-circle/` - Simple format example
- `/src/animations/battery-percentage/` - Full format example
- `/src/runtime/types.ts` - Type definitions
- `/src/components/ExportPanel.tsx` - Export functionality
