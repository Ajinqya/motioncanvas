import type { VercelRequest, VercelResponse } from '@vercel/node';
import OpenAI from 'openai';

// ─── System prompt ───────────────────────────────────────────────────────────

const COMPOSE_SYSTEM_PROMPT = `You are an AI assistant for a motion graphics sequence composer. The composer has a timeline where animation clips (scenes) play in sequence on a shared canvas.

You help users modify their sequences through natural language commands. When the user asks you to make changes, call the appropriate tool(s). You can call multiple tools in a single response to batch changes.

## Key Concepts
- **Scene**: A clip on the timeline, referencing a gallery animation with customizable params.
- **Scene index**: 0-based position in the timeline (first scene = 0, second = 1, etc.).
- **Duration**: In milliseconds. 1 second = 1000ms, 1.5s = 1500ms, 2s = 2000ms, etc.
- **Params**: Animation-specific parameters like colors, speed, scale, etc. Each animation has different params. Check the scene's "Available params" to know what you can set.
- **Transform**: Per-scene scale, position offset, and opacity applied on the sequence canvas.
- **Transition**: Visual transition to the next scene (cut, fade, dissolve, wipe-left, wipe-right, wipe-up).

## Guidelines
- When the user says "first clip/scene", that's index 0. "Second" = 1, "third" = 2, "last" = last index.
- When the user mentions a scene by name/label, find the matching index from the state.
- For color changes, use hex format (#ff0000 for red, #00ff00 for green, #0000ff for blue, #ffffff for white, #000000 for black, etc.).
- When changing a color param, check which param name controls the color the user is referring to (e.g., "primaryColor", "secondaryColor", "backgroundColor", "waveColor", etc.).
- You can call multiple tools to make several changes at once.
- If the timeline is empty and the user asks to add something, use add_scene for gallery animations or create_and_add_scene for new custom animations.
- If you're unsure what the user wants, ask a clarifying question (just respond with text, no tool calls).

## Lanes (Simultaneous Playback)
The timeline supports multiple lanes/tracks:
- **Lane 0** = Primary storyline. Scenes here play sequentially one after another.
- **Lane 1, 2, ...** = Secondary lanes above the primary. Scenes here play simultaneously (overlaid) with their anchor scene.
- **Lane -1, -2, ...** = Secondary lanes below the primary.

When a scene is on a non-zero lane, it's "connected" to an anchor scene on the primary storyline and plays at the same time. The offset_ms controls the timing: 0 means it starts exactly when the anchor starts, positive values delay the start, negative values start earlier.

Use move_scene_to_lane to:
- Move a scene from primary to a secondary lane (makes it play simultaneously with another scene)
- Move a scene back to the primary storyline (makes it play sequentially again)
- Layer scenes for composite effects

For simultaneous playback, set transparent_bg on the overlay scene so the underlying scene shows through.

## Keyframes (Animated Transform Properties)
Each scene's transform properties (scale, offsetX, offsetY, opacity) can be animated over time using keyframes. Keyframes define values at specific points in normalized time (0 = start of scene, 1 = end of scene), with interpolation between them.

Available tracks: transform.scale, transform.offsetX, transform.offsetY, transform.opacity

Easing options: linear, easeIn, easeOut, easeInOut (default), step (holds value until next keyframe)

Use set_keyframe to add/update keyframes. Common patterns:
- **Fade in**: set opacity keyframes at t=0 v=0 and t=0.3 v=1
- **Fade out**: set opacity keyframes at t=0.7 v=1 and t=1 v=0
- **Scale up entrance**: set scale keyframes at t=0 v=0 easeOut and t=0.3 v=1
- **Slide in from left**: set offsetX keyframes at t=0 v=-200 easeOut and t=0.3 v=0
- **Bounce**: set scale keyframes at t=0 v=0.5, t=0.4 v=1.1 easeOut, t=0.6 v=0.95 easeInOut, t=0.8 v=1
- **Pulse**: set scale keyframes at t=0 v=1, t=0.5 v=1.2, t=1 v=1

You can combine keyframes across multiple tracks for rich animations (e.g., fade in + scale up + slide in simultaneously).

If the state shows existing keyframes on a scene, you can modify, remove, or add more. Use clear_keyframes to remove all keyframes from a track or scene.

## Answering Questions
You can answer questions about the timeline state without making any changes. Just respond with helpful text — NO tool calls needed. Examples:
- "How long is my sequence?" → Calculate the total duration from the scene list and reply.
- "Which scene is the longest?" → Find the scene with the highest durationMs and reply.
- "What animations do I have?" → List the scenes from the state.
- "What color is the background of scene 2?" → Look at the scene's params and reply.
- "Describe my timeline" → Give a concise summary of the sequence: how many scenes, total duration, transitions used, etc.
- "What params can I change on the first scene?" → List the available params for that scene.

When the user asks a question, provide a clear, concise answer based on the [SEQUENCE STATE] data. Do not call any tools.

## Creating New Animations
When the user asks to create a completely new animation that doesn't exist in the gallery (e.g. "create a particle effect", "make a spinning logo animation"), use the create_and_add_scene tool. This generates a brand-new canvas animation from a text description and adds it directly to the timeline.
- Use create_and_add_scene when the user describes something not available in the "Available animations" list.
- Use add_scene when the user wants to add an existing gallery animation.
- You can combine create_and_add_scene with other tools (e.g., create an animation AND update another scene's duration).

The current sequence state is included at the start of each user message in [SEQUENCE STATE]...[END STATE] tags.`;

// ─── Tool definitions ────────────────────────────────────────────────────────

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'update_scene',
      description:
        'Update properties of a specific scene on the timeline. Only include the properties you want to change.',
      parameters: {
        type: 'object',
        properties: {
          scene_index: {
            type: 'number',
            description: '0-based index of the scene in the timeline',
          },
          durationMs: {
            type: 'number',
            description: 'New duration in milliseconds (e.g. 1500 for 1.5s)',
          },
          label: {
            type: 'string',
            description: 'Human-readable label for the scene',
          },
          transparentBg: {
            type: 'boolean',
            description: 'Whether the animation background should be transparent',
          },
          params: {
            type: 'object',
            description:
              'Animation parameter overrides. Use parameter names from the scene\'s "Available params" list. For colors use hex strings, for numbers use numbers.',
          },
          transform: {
            type: 'object',
            description: 'Scene transform on the sequence canvas',
            properties: {
              scale: { type: 'number', description: 'Scale factor (1 = 100%, 0.5 = 50%, 2 = 200%)' },
              offsetX: { type: 'number', description: 'Horizontal offset in pixels' },
              offsetY: { type: 'number', description: 'Vertical offset in pixels' },
              opacity: { type: 'number', description: 'Opacity from 0 (invisible) to 1 (fully visible)' },
            },
          },
          transition: {
            type: 'object',
            description: 'Transition to the next scene',
            properties: {
              type: {
                type: 'string',
                enum: ['cut', 'fade', 'dissolve', 'wipe-left', 'wipe-right', 'wipe-up'],
                description: 'Transition type',
              },
              durationMs: {
                type: 'number',
                description: 'Transition duration in milliseconds (e.g. 500)',
              },
            },
          },
        },
        required: ['scene_index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_scene',
      description: 'Remove a scene from the timeline by its index',
      parameters: {
        type: 'object',
        properties: {
          scene_index: {
            type: 'number',
            description: '0-based index of the scene to remove',
          },
        },
        required: ['scene_index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_scene',
      description: 'Add an animation from the gallery to the end of the timeline',
      parameters: {
        type: 'object',
        properties: {
          animation_id: {
            type: 'string',
            description: 'ID of the animation from the "Available animations" list',
          },
        },
        required: ['animation_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'duplicate_scene',
      description: 'Duplicate an existing scene (creates a copy right after it)',
      parameters: {
        type: 'object',
        properties: {
          scene_index: {
            type: 'number',
            description: '0-based index of the scene to duplicate',
          },
        },
        required: ['scene_index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_sequence',
      description: 'Update sequence-level settings like name, background color, resolution, or FPS',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Sequence name' },
          background: { type: 'string', description: 'Background color in hex (e.g. #1a1a2e)' },
          fps: { type: 'number', description: 'Frames per second (e.g. 30, 60)' },
          width: { type: 'number', description: 'Canvas width in pixels' },
          height: { type: 'number', description: 'Canvas height in pixels' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_scene_to_lane',
      description: 'Move a scene to a different lane (track) on the timeline. Lane 0 is the primary storyline (sequential). Non-zero lanes are secondary tracks where the scene plays simultaneously with an anchor scene on lane 0. Use this to layer scenes, create overlays, or move scenes back to sequential playback.',
      parameters: {
        type: 'object',
        properties: {
          scene_index: { type: 'number', description: '0-based index of the scene to move (from the flat scenes list)' },
          target_lane: { type: 'number', description: 'Target lane. 0 = primary storyline (sequential), 1 = above primary, -1 = below primary, etc.' },
          anchor_scene_index: { type: 'number', description: 'For non-zero lanes: 0-based index of the scene to synchronize with. This scene should be on lane 0 (primary). Defaults to the first primary scene.' },
          offset_ms: { type: 'number', description: 'Time offset in ms from anchor scene start. 0 = start at same time. Positive = delayed start. Default: 0.' },
        },
        required: ['scene_index', 'target_lane'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_keyframe',
      description: 'Add or update a keyframe on a scene\'s transform track. Keyframes animate transform properties (scale, position, opacity) over the scene duration. Time is normalized 0-1 (0=start, 0.5=middle, 1=end). Call multiple times to create multi-keyframe animations.',
      parameters: {
        type: 'object',
        properties: {
          scene_index: { type: 'number', description: '0-based scene index' },
          track: { type: 'string', enum: ['transform.scale', 'transform.offsetX', 'transform.offsetY', 'transform.opacity'], description: 'Which transform property to keyframe' },
          time: { type: 'number', description: 'Normalized time within the scene (0=start, 0.5=middle, 1=end)' },
          value: { type: 'number', description: 'Value at this keyframe. Scale: 1=100%. Offset: pixels. Opacity: 0-1.' },
          easing: { type: 'string', enum: ['linear', 'easeIn', 'easeOut', 'easeInOut', 'step'], description: 'Easing curve to the next keyframe. Default: easeInOut.' },
        },
        required: ['scene_index', 'track', 'time', 'value'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_keyframe',
      description: 'Remove a keyframe at a specific time from a scene\'s transform track.',
      parameters: {
        type: 'object',
        properties: {
          scene_index: { type: 'number', description: '0-based scene index' },
          track: { type: 'string', enum: ['transform.scale', 'transform.offsetX', 'transform.offsetY', 'transform.opacity'], description: 'Which transform track' },
          time: { type: 'number', description: 'Normalized time of the keyframe to remove (0-1)' },
        },
        required: ['scene_index', 'track', 'time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'clear_keyframes',
      description: 'Clear all keyframes from a specific track, or from all tracks on a scene.',
      parameters: {
        type: 'object',
        properties: {
          scene_index: { type: 'number', description: '0-based scene index' },
          track: { type: 'string', enum: ['transform.scale', 'transform.offsetX', 'transform.offsetY', 'transform.opacity'], description: 'Which track to clear. If omitted, clears ALL keyframe tracks on the scene.' },
        },
        required: ['scene_index'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_and_add_scene',
      description: 'Generate a brand-new canvas animation from a text description and add it to the timeline. Use this when the user wants to create something that does NOT exist in the "Available animations" gallery list. The animation will be generated by AI and added as a custom code scene.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'Detailed description of the animation to create (e.g. "a pulsing neon blue circle with glow effect on a dark background", "colorful particle system with gravity"). Be specific about colors, motion, and style.',
          },
          label: {
            type: 'string',
            description: 'Human-readable name/label for the scene on the timeline (e.g. "Neon Pulse", "Particle Rain")',
          },
          durationMs: {
            type: 'number',
            description: 'Duration in milliseconds (default 3000). Use 2000-6000 for most animations.',
          },
        },
        required: ['description', 'label'],
      },
    },
  },
];

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { messages, apiKey } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Missing or invalid messages array' });
    }

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      return res.status(400).json({
        error: 'No OpenAI API key provided. Please set your API key in the chat settings.',
      });
    }

    const openai = new OpenAI({ apiKey: key });

    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: COMPOSE_SYSTEM_PROMPT },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: chatMessages,
      tools,
      tool_choice: 'auto',
      temperature: 0.2, // low temperature for more predictable tool calls
    });

    const choice = completion.choices[0];
    const message = choice?.message;

    if (!message) {
      return res.status(500).json({ error: 'No response from OpenAI' });
    }

    // If the model returned tool calls, parse and return them
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCalls = message.tool_calls.map((tc) => {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments);
        } catch {
          args = {};
        }
        return { name: tc.function.name, arguments: args };
      });

      return res.status(200).json({
        success: true,
        toolCalls,
        reply: message.content || null,
      });
    }

    // No tool calls — just a text response
    return res.status(200).json({
      success: true,
      toolCalls: null,
      reply: message.content || "I'm ready to help with your sequence. What would you like to change?",
    });
  } catch (error) {
    console.error('Compose chat API error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: msg });
  }
}
