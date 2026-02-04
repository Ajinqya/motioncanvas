# Animation Format Examples

This document shows practical examples of both animation formats and how to convert between them.

## Example 1: Pulse Circle (Simple Format)

A minimalist pulsing circle animation - perfect for loading indicators.

```typescript
import type { SimpleAnimationDefinition } from './runtime/types';

export default {
  name: 'Pulse Circle',
  fps: 60,
  durationMs: 1500,
  width: 400,
  height: 400,
  background: '#1a1a2e',
  
  render: (ctx, { width, height, progress }) => {
    // Pulse effect using sine wave
    const pulse = Math.sin(progress * Math.PI * 2) * 0.3 + 0.7;
    const radius = 40 * pulse;
    
    // Draw circle with glow
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  },
} as SimpleAnimationDefinition;
```

**When to use:** Quick prototypes, sharing with non-TypeScript users, embedding in other projects.

---

## Example 2: Progress Bar (Full Format with Parameters)

A customizable progress bar with many parameters for different use cases.

```typescript
import type { AnimationDefinition } from './runtime/types';
import { number, color, boolean, folder } from './runtime/params';

interface ProgressBarParams {
  targetProgress: number;
  barColor: string;
  backgroundColor: string;
  height: number;
  showPercentage: boolean;
  animationSpeed: number;
}

export default {
  id: 'progress-bar',
  name: 'Progress Bar',
  fps: 60,
  durationMs: 3000,
  width: 600,
  height: 400,
  background: '#0a0a0f',
  
  params: {
    defaults: {
      targetProgress: 75,
      barColor: '#2EB57D',
      backgroundColor: '#1a1a2e',
      height: 40,
      showPercentage: true,
      animationSpeed: 1.0,
    },
    schema: {
      ...folder('Progress', {
        targetProgress: number({ value: 75, min: 0, max: 100, step: 5 }),
        animationSpeed: number({ value: 1.0, min: 0.5, max: 3, step: 0.5 }),
      }),
      ...folder('Appearance', {
        barColor: color({ value: '#2EB57D' }),
        backgroundColor: color({ value: '#1a1a2e' }),
        height: number({ value: 40, min: 20, max: 80, step: 10 }),
        showPercentage: boolean({ value: true }),
      }),
    },
  },
  
  render({ ctx, time, width, height, params }) {
    const { targetProgress, barColor, backgroundColor, height: barHeight, showPercentage, animationSpeed } = params;
    
    // Calculate current progress with easing
    const t = Math.min(time * animationSpeed, 1);
    const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const currentProgress = easedT * targetProgress;
    
    // Calculate dimensions
    const barWidth = width * 0.7;
    const barX = (width - barWidth) / 2;
    const barY = (height - barHeight) / 2;
    
    // Draw background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Draw progress
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, (barWidth * currentProgress) / 100, barHeight);
    
    // Draw border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Draw percentage text
    if (showPercentage) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `${Math.round(currentProgress)}%`,
        width / 2,
        barY + barHeight / 2
      );
    }
  },
} as AnimationDefinition<ProgressBarParams>;
```

**When to use:** Internal project animations, need UI controls, multiple use cases requiring different parameter values.

---

## Example 3: Converting Full to Simple

Here's how you'd export the Progress Bar as a simple, standalone animation:

### Step 1: Use the Export Panel

1. Open the animation in the Player
2. Adjust parameters to your desired values
3. Click "Copy Simple Format"

### Step 2: Manual Conversion (Alternative)

```typescript
import { toSimpleAnimation, generateSimpleAnimationCode } from './runtime/types';
import { progressBar } from './animations/progress-bar';

// Convert with specific parameter values
const simpleVersion = toSimpleAnimation(progressBar, {
  targetProgress: 85,
  barColor: '#ec4899',
  showPercentage: true,
});

// Generate standalone code
const code = generateSimpleAnimationCode(simpleVersion);
console.log(code);
```

**Result:** A standalone function that works anywhere:

```typescript
function render(ctx, { width, height, progress }) {
  // All parameters baked in
  const targetProgress = 85;
  const barColor = '#ec4899';
  const backgroundColor = '#1a1a2e';
  const barHeight = 40;
  const showPercentage = true;
  
  const currentProgress = progress * targetProgress;
  const barWidth = width * 0.7;
  const barX = (width - barWidth) / 2;
  const barY = (height - barHeight) / 2;
  
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  ctx.fillStyle = barColor;
  ctx.fillRect(barX, barY, (barWidth * currentProgress) / 100, barHeight);
  
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
  
  if (showPercentage) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(currentProgress)}%`, width / 2, barY + barHeight / 2);
  }
}
```

---

## Example 4: Staggered Elements (Advanced Simple Format)

Shows how to create complex animations with the simple format.

```typescript
export default {
  name: 'Staggered Boxes',
  fps: 60,
  durationMs: 2000,
  width: 800,
  height: 400,
  
  render: (ctx, { width, height, progress }) => {
    const boxCount = 8;
    const boxSize = 40;
    const spacing = 20;
    const totalWidth = boxCount * (boxSize + spacing) - spacing;
    const startX = (width - totalWidth) / 2;
    const centerY = height / 2;
    
    // Stagger delay for each box
    for (let i = 0; i < boxCount; i++) {
      const staggerDelay = (i / boxCount) * 0.3;
      const localProgress = Math.max(0, Math.min(1, (progress - staggerDelay) / 0.7));
      
      // Bounce easing
      const bounce = localProgress < 0.5
        ? 2 * localProgress * localProgress
        : 1 - Math.pow(-2 * localProgress + 2, 2) / 2;
      
      const x = startX + i * (boxSize + spacing);
      const y = centerY - boxSize / 2;
      const scale = 0.5 + bounce * 0.5;
      const rotation = bounce * Math.PI * 2;
      
      ctx.save();
      ctx.translate(x + boxSize / 2, y + boxSize / 2);
      ctx.rotate(rotation);
      ctx.scale(scale, scale);
      
      // Color based on position
      const hue = (i / boxCount) * 360;
      ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
      ctx.fillRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
      
      ctx.restore();
    }
  },
} as SimpleAnimationDefinition;
```

**Key concept:** Even complex animations with multiple elements can use the simple format. The `progress` value is your timeline.

---

## Best Practices

### Simple Format
✅ **DO:**
- Use for one-off animations
- Bake constants directly into the code
- Keep it self-contained
- Use for quick experiments

❌ **DON'T:**
- Add parameter logic (defeats the purpose)
- Make it too complex (consider full format)
- Forget to document what values mean

### Full Format
✅ **DO:**
- Add clear parameter names and ranges
- Group related parameters with folders
- Set sensible defaults
- Use setup() for expensive initialization

❌ **DON'T:**
- Over-parameterize (more params = more complexity)
- Use params for values that never change
- Forget to handle edge cases in render

---

## Quick Reference

| Feature | Simple Format | Full Format |
|---------|--------------|-------------|
| Parameters | ❌ Baked in | ✅ Dynamic with UI |
| Timeline | `progress` (0-1) | `time` (seconds) |
| Setup hook | ❌ No | ✅ Yes |
| TypeScript | Optional | Recommended |
| Best for | Sharing, export | Internal use |
| Complexity | Minimal | Full-featured |

---

## Next Steps

1. **Start Simple:** Create new animations in simple format for quick iteration
2. **Upgrade When Needed:** Convert to full format when you need parameters
3. **Export for Sharing:** Always export as simple format when sharing outside this project
4. **Document Parameters:** Add clear names and ranges for any parameters you add

See `ANIMATION_FORMATS.md` for more details on the type definitions and conversion utilities.
