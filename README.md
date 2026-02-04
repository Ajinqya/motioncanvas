# Canvas Animation Lab

A local web app for creating, previewing, and exporting canvas animations.

## Features

- **Dual Format Support**: Create animations in simple (portable) or full (parameter-rich) format
- **Draft Mode**: Iterate quickly on animations with hot-reload
- **Gallery**: Browse and preview finalized animations
- **Parameter Controls**: Tweak animation parameters in real-time using Leva
- **Smart Export**: Export to simple format with parameters baked in
- **Auto-Detection**: System automatically handles both animation formats

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Workflow

### 1. Create a new animation

Edit `src/draft/animation.ts` to create your animation. The draft page at `/draft` will hot-reload as you make changes.

### 2. Iterate with parameters

Define tweakable parameters in your animation's `params.schema`. These will appear as controls in the sidebar.

### 3. Promote to gallery

Once you're happy with your animation, run:

```bash
npm run promote -- --id my-animation-id
```

This will:
- Copy your animation to `src/animations/my-animation-id/`
- Create a `meta.json` with your prompt and tags
- Make it available in the gallery

### 4. Export

From any animation's player page, click "Export" to:
- Copy the source code to clipboard
- Download the code and metadata
- Download everything as a zip

## Animation Formats

This project supports **two animation formats** to suit different needs:

### Simple Format (Minimal & Portable)

Perfect for quick prototypes and sharing:

```typescript
export default {
  name: 'Pulse Circle',
  fps: 60,
  durationMs: 2000,
  width: 600,
  height: 400,
  
  render: (ctx, { width, height, progress }) => {
    // progress goes from 0 to 1
    const radius = 50 * progress;
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(width/2, height/2, radius, 0, Math.PI * 2);
    ctx.fill();
  },
};
```

### Full Format (Feature-Rich)

For complex animations with parameters:



```typescript
import type { AnimationDefinition } from '../runtime/types';
import { number, color, folder } from '../runtime/params';

interface MyParams {
  speed: number;
  color: string;
}

const animation: AnimationDefinition<MyParams> = {
  id: 'my-animation',
  name: 'My Animation',
  fps: 60,
  durationMs: 3000, // 3 second loop (omit for infinite)
  width: 800,
  height: 600,
  background: '#000000',

  params: {
    defaults: {
      speed: 1,
      color: '#ff0000',
    },
    schema: {
      speed: number({ value: 1, min: 0.1, max: 5, step: 0.1 }),
      color: color({ value: '#ff0000' }),
    },
  },

  render({ ctx, t, dt, size, params }) {
    // Your animation code here
    // ctx: CanvasRenderingContext2D
    // t: time in seconds
    // dt: delta time since last frame
    // size: { w, h } canvas dimensions
    // params: current parameter values
  },
};

export default animation;
```

## Parameter Types

- `number({ value, min, max, step })` - Numeric slider
- `color({ value })` - Color picker
- `string({ value })` - Text input
- `select({ value, options })` - Dropdown
- `boolean({ value })` - Toggle
- `vector2({ value: { x, y }, min, max })` - 2D point
- `folder(label, fields)` - Group parameters

## Project Structure

```
src/
├── animations/          # Finalized animations (auto-discovered)
│   └── <id>/
│       ├── index.ts     # Animation definition
│       └── meta.json    # Metadata (prompt, tags, etc.)
├── draft/
│   └── animation.ts     # Current draft animation
├── runtime/
│   ├── types.ts         # Core types
│   ├── player.ts        # Canvas player with HiDPI support
│   ├── params.ts        # Parameter schema helpers
│   └── meta.ts          # Metadata utilities
├── pages/
│   ├── Gallery.tsx      # Animation gallery
│   ├── Player.tsx       # Animation player with controls
│   └── Draft.tsx        # Draft mode page
├── components/
│   ├── ParameterPanel.tsx
│   └── ExportPanel.tsx
└── App.tsx              # Routes
```

## Routes

- `/` - Gallery (all finalized animations)
- `/a/:id` - Player for a specific animation
- `/draft` - Draft mode for iterating on new animations

## Documentation

- **[ANIMATION_FORMATS.md](./ANIMATION_FORMATS.md)** - Complete guide to both animation formats
- **[EXAMPLES.md](./EXAMPLES.md)** - Practical examples and conversion patterns
- **[DUAL_FORMAT_IMPLEMENTATION.md](./DUAL_FORMAT_IMPLEMENTATION.md)** - Implementation details and technical reference

## Exporting to Simple Format

Any animation can be exported to the portable simple format:

1. Open the animation in the Player
2. Adjust parameters to your desired values
3. Click the **"Copy Simple Format"** button
4. Paste the standalone code anywhere - no dependencies needed!

The exported code is self-contained with all parameter values baked in.
