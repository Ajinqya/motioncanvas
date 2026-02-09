import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Send,
  X,
  Loader2,
  ExternalLink,
  Key,
  AlertCircle,
  Trash2,
  Pencil,
  Plus,
  ChevronDown,
  Check,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useComposerChat,
  buildSequenceStatePrompt,
  executeComposerToolCalls,
} from '../context/ComposerChatContext';
import { extractModuleConfig } from '../runtime/custom-code';

// ── Types ────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Display-only content (what the user sees — without injected state/source) */
  displayContent?: string;
  animationId?: string;
  animationPath?: string;
  animationName?: string;
  isError?: boolean;
  /** Generated animation code (for "Add to Timeline" in production) */
  animationCode?: string;
  /** Extracted config from the generated code */
  animationCodeConfig?: { name?: string; durationMs?: number; width?: number; height?: number; fps?: number; background?: string };
}

interface AnimationInfo {
  id: string;
  name: string;
  source: string;
}

type ChatMode = 'create' | 'iterate' | 'compose';

const API_KEY_STORAGE_KEY = 'openai-api-key';

// ── Component ────────────────────────────────────────────────
export function AnimationChat() {
  const navigate = useNavigate();
  const location = useLocation();

  // Composer integration
  const { actionsRef, isComposerActive } = useComposerChat();
  const isOnComposePage = location.pathname === '/compose';

  // Derive current animation from route: /a/:id
  const routeAnimationId = location.pathname.startsWith('/a/')
    ? location.pathname.split('/a/')[1]?.split('/')[0] ?? null
    : null;

  // Panel state
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // API key
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE_KEY) || '');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  // Animation context
  const [animations, setAnimations] = useState<AnimationInfo[]>([]);
  const [mode, setMode] = useState<ChatMode>('create');
  const [selectedAnimationId, setSelectedAnimationId] = useState<string | null>(null);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [animationSearch, setAnimationSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Pending scene to add to timeline after navigating to Composer
  const pendingSceneRef = useRef<{ code: string; name: string; config?: { durationMs?: number; width?: number; height?: number; fps?: number; background?: string } } | null>(null);

  // ── Derived ──────────────────────────────────────────────
  const selectedAnimation = animations.find((a) => a.id === selectedAnimationId) ?? null;

  const filteredAnimations = animationSearch
    ? animations.filter(
        (a) =>
          a.name.toLowerCase().includes(animationSearch.toLowerCase()) ||
          a.id.toLowerCase().includes(animationSearch.toLowerCase())
      )
    : animations;

  // ── Sync mode with route ─────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (isOnComposePage && isComposerActive) {
      setMode('compose');
      setSelectedAnimationId(null);
    } else if (routeAnimationId && animations.length > 0) {
      const found = animations.find((a) => a.id === routeAnimationId);
      if (found) {
        setMode('iterate');
        setSelectedAnimationId(routeAnimationId);
      }
    } else if (!routeAnimationId && !isOnComposePage && messages.length === 0) {
      setMode('create');
      setSelectedAnimationId(null);
    }
  }, [isOpen, routeAnimationId, animations.length, isOnComposePage, isComposerActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effects ──────────────────────────────────────────────
  // Cmd+K / Ctrl+K to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            // Opening — focus input after panel appears
            setTimeout(() => inputRef.current?.focus(), 150);
          }
          return !prev;
        });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && !showApiKeyInput) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, showApiKeyInput]);

  // Fetch animation list when panel opens (not needed for compose-only, but harmless)
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/animations-list')
      .then((res) => res.json())
      .then((data: AnimationInfo[]) => setAnimations(data))
      .catch(() => {});
  }, [isOpen]);

  // Process pending scene when Composer becomes active
  useEffect(() => {
    if (isComposerActive && actionsRef.current && pendingSceneRef.current) {
      const { code, name, config } = pendingSceneRef.current;
      pendingSceneRef.current = null;
      actionsRef.current.addCustomCodeScene(code, name, config);
    }
  }, [isComposerActive, actionsRef]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showModeDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModeDropdown(false);
        setAnimationSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showModeDropdown]);

  // ── Handlers ─────────────────────────────────────────────
  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    setShowApiKeyInput(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // Build the full message content with context injected
    let fullContent = trimmed;
    if (mode === 'iterate' && selectedAnimation) {
      fullContent = `[EXISTING ANIMATION: ${selectedAnimation.id}]\n${selectedAnimation.source}\n[END ANIMATION]\n\n${trimmed}`;
    } else if (mode === 'compose' && actionsRef.current) {
      const state = actionsRef.current.getState();
      fullContent = buildSequenceStatePrompt(state) + '\n\n' + trimmed;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: fullContent,
      displayContent: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content:
          m.role === 'assistant' && m.animationId
            ? `${m.content} [Created/updated animation: ${m.animationId}]`
            : m.content,
      }));

      if (mode === 'compose') {
        // ── Compose mode: call compose endpoint ──
        const payload: Record<string, unknown> = { messages: history };
        if (apiKey) payload.apiKey = apiKey;

        const response = await fetch('/api/chat-compose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.error?.includes('API key') || data.error?.includes('api key'))
            setShowApiKeyInput(true);
          throw new Error(data.error || 'Request failed');
        }

        // Execute tool calls against the Composer
        let replyContent = data.reply || '';
        if (data.toolCalls && data.toolCalls.length > 0 && actionsRef.current) {
          // Check if there's a create_and_add_scene tool call — show interim message
          const hasCreate = data.toolCalls.some(
            (tc: { name: string }) => tc.name === 'create_and_add_scene'
          );
          if (hasCreate && replyContent) {
            // Show the AI's reply immediately before the long generation step
            const interimMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: replyContent,
            };
            setMessages((prev) => [...prev, interimMessage]);
            replyContent = '';
          }

          const summaries = await executeComposerToolCalls(
            data.toolCalls,
            actionsRef.current,
            { apiKey: apiKey || undefined },
          );
          if (!replyContent) {
            replyContent = summaries.join('\n');
          } else {
            replyContent += '\n\n' + summaries.join('\n');
          }
        }

        if (!replyContent) {
          replyContent = 'Done! The sequence has been updated.';
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: replyContent,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // ── Create / Iterate mode: call animation endpoint ──
        const payload: Record<string, unknown> = { messages: history };
        if (apiKey) payload.apiKey = apiKey;

        const response = await fetch('/api/chat-create-animation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.error?.includes('API key') || data.error?.includes('api key'))
            setShowApiKeyInput(true);
          throw new Error(data.error || 'Request failed');
        }

        let replyContent = data.reply || data.description || 'Animation created!';
        const hasPath = !!data.path;
        let addedToTimeline = false;

        // Extract config from generated code (used for timeline addition)
        const codeConfig = data.code ? extractModuleConfig(data.code) : null;

        // In production (no file path), try to add directly to timeline
        if (data.success && data.code && !hasPath) {
          if (isComposerActive && actionsRef.current) {
            // On the Composer page — add directly to timeline
            actionsRef.current.addCustomCodeScene(data.code, data.name || 'AI Generated', {
              durationMs: codeConfig?.durationMs ?? 3000,
              width: codeConfig?.width,
              height: codeConfig?.height,
              fps: codeConfig?.fps,
              background: codeConfig?.background,
            });
            replyContent = `${data.description || 'Generated animation!'}\n\nAdded to your timeline as a clip.`;
            addedToTimeline = true;
          } else {
            replyContent = data.description || 'Generated animation!';
          }
        }

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: replyContent,
          animationId: data.success ? data.id : undefined,
          animationPath: hasPath ? data.path : undefined,
          animationName: data.success ? data.name : undefined,
          isError: !data.success,
          // Store code for "Add to Timeline" button (only when no path and not already added)
          animationCode: (data.success && data.code && !hasPath && !addedToTimeline) ? data.code : undefined,
          animationCodeConfig: (data.success && data.code && !hasPath && !addedToTimeline) ? {
            name: data.name,
            durationMs: codeConfig?.durationMs ?? 3000,
            width: codeConfig?.width,
            height: codeConfig?.height,
            fps: codeConfig?.fps,
            background: codeConfig?.background,
          } : undefined,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (data.success && data.id && hasPath) {
          fetch('/api/animations-list')
            .then((res) => res.json())
            .then((list: AnimationInfo[]) => {
              setAnimations(list);
              setSelectedAnimationId(data.id);
              setMode('iterate');
            })
            .catch(() => {});
        }
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Something went wrong',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, apiKey, messages, mode, selectedAnimation, actionsRef, isComposerActive]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearMessages = () => {
    setMessages([]);
    if (isOnComposePage && isComposerActive) {
      setMode('compose');
      setSelectedAnimationId(null);
    } else if (routeAnimationId) {
      setMode('iterate');
      setSelectedAnimationId(routeAnimationId);
    } else {
      setMode('create');
      setSelectedAnimationId(null);
    }
  };

  const switchToCreate = () => {
    setMode('create');
    setSelectedAnimationId(null);
    setShowModeDropdown(false);
    setAnimationSearch('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const switchToIterate = (id: string) => {
    setMode('iterate');
    setSelectedAnimationId(id);
    setShowModeDropdown(false);
    setAnimationSearch('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const switchToCompose = () => {
    setMode('compose');
    setSelectedAnimationId(null);
    setShowModeDropdown(false);
    setAnimationSearch('');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Handler: Add generated animation to the Composer timeline
  const addToTimeline = useCallback((code: string, name: string, config?: { durationMs?: number; width?: number; height?: number; fps?: number; background?: string }) => {
    if (actionsRef.current) {
      // Composer is already active — add directly
      actionsRef.current.addCustomCodeScene(code, name, config);
    } else {
      // Queue and navigate to Composer
      pendingSceneRef.current = { code, name, config };
      navigate('/compose');
    }
  }, [actionsRef, navigate]);

  // ── Mode label for the toggle button ─────────────────────
  const modeLabel =
    mode === 'compose'
      ? 'Sequence'
      : mode === 'create'
        ? 'New'
        : selectedAnimation
          ? selectedAnimation.name.length > 16
            ? selectedAnimation.name.slice(0, 16) + '...'
            : selectedAnimation.name
          : 'Edit';

  // ── Header text ──────────────────────────────────────────
  const headerTitle = mode === 'compose' ? 'Sequence Assistant' : 'Animation Creator';
  const headerSubtitle =
    mode === 'compose'
      ? 'Edit your sequence with natural language'
      : mode === 'create'
        ? 'Creating new animation'
        : `Editing "${selectedAnimation?.name ?? '...'}"`;

  // ── Loading message ──────────────────────────────────────
  const loadingMessage =
    mode === 'compose'
      ? 'Thinking...'
      : mode === 'iterate' && selectedAnimation
        ? `Updating "${selectedAnimation.name}"...`
        : 'Generating animation...';

  // ── Compose mode suggestions ─────────────────────────────
  const composeSuggestions = [
    'Describe my timeline',
    'Make the first clip 2 seconds long',
    'Create a pulsing neon circle and add it to the timeline',
    'Add a fade transition between all scenes',
    'Which scene is the longest?',
  ];

  // ── Render ───────────────────────────────────────────────
  return (
    <>
      {/* Floating chat panel */}
      <div
        className={cn(
          'fixed bottom-6 right-6 z-50 flex flex-col transition-all duration-300 ease-out',
          isOpen
            ? 'w-[420px] h-[600px] opacity-100 translate-y-0'
            : 'w-0 h-0 opacity-0 translate-y-4 pointer-events-none'
        )}
      >
        <div className="flex flex-col h-full rounded-2xl border bg-background shadow-2xl overflow-hidden">
          {/* ── Header ──────────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <div className={cn(
                'h-8 w-8 rounded-lg flex items-center justify-center',
                mode === 'compose' ? 'bg-violet-500/10' : 'bg-primary/10'
              )}>
                {mode === 'compose' ? (
                  <Film className="h-4 w-4 text-violet-500" />
                ) : (
                  <Sparkles className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-none">{headerTitle}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{headerSubtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setShowApiKeyInput(true)}
                title="API Key"
              >
                <Key className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={clearMessages}
                title="Clear chat"
                disabled={messages.length === 0}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* ── API Key input ───────────────────────────── */}
          {showApiKeyInput && (
            <div className="px-4 py-3 border-b bg-muted/10">
              <p className="text-xs text-muted-foreground mb-2">
                Enter your OpenAI API key. It's stored locally in your browser.
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveApiKey(apiKey);
                    }
                  }}
                  className="h-8 text-xs"
                  autoFocus
                />
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => saveApiKey(apiKey)}
                  disabled={!apiKey.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* ── Messages area ───────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className={cn(
                  'h-12 w-12 rounded-2xl flex items-center justify-center mb-3',
                  mode === 'compose' ? 'bg-violet-500/10' : 'bg-primary/10'
                )}>
                  {mode === 'compose' ? (
                    <Film className="h-6 w-6 text-violet-500" />
                  ) : (
                    <Sparkles className="h-6 w-6 text-primary" />
                  )}
                </div>

                {mode === 'compose' ? (
                  <>
                    <p className="text-sm font-medium mb-1">Sequence assistant</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Ask questions, create new animations, or edit your timeline — all in natural language.
                    </p>
                    <div className="space-y-2 w-full">
                      {composeSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setInput(suggestion);
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </>
                ) : mode === 'iterate' && selectedAnimation ? (
                  <>
                    <p className="text-sm font-medium mb-1">
                      Editing "{selectedAnimation.name}"
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Describe what you want to change. The AI has the full source code.
                    </p>
                    <div className="space-y-2 w-full">
                      {[
                        'Make it smoother with better easing',
                        'Add a glow effect',
                        'Change the color palette to ocean blues',
                        'Make it loop more seamlessly',
                        'Speed it up and add more elements',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setInput(suggestion);
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium mb-1">Create animations with AI</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Describe the animation you want and I'll generate it for you.
                    </p>
                    <div className="space-y-2 w-full">
                      {[
                        'A pulsing neon circle that glows',
                        'Rotating geometric patterns',
                        'Particle system with gravity',
                        'Smooth wave animation',
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setInput(suggestion);
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg border bg-card hover:bg-accent transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : message.isError
                        ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-md'
                        : 'bg-muted rounded-bl-md'
                  )}
                >
                  {message.isError && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Error</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {message.displayContent ?? message.content}
                  </p>
                  {message.animationPath && (
                    <button
                      onClick={() => {
                        navigate(message.animationPath!);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'mt-2 flex items-center gap-1.5 text-xs font-medium',
                        'px-3 py-1.5 rounded-lg transition-colors',
                        message.role === 'user'
                          ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground'
                          : 'bg-primary/10 hover:bg-primary/20 text-primary'
                      )}
                    >
                      <ExternalLink className="h-3 w-3" />
                      View "{message.animationName}"
                    </button>
                  )}
                  {message.animationCode && (
                    <button
                      onClick={() => {
                        addToTimeline(
                          message.animationCode!,
                          message.animationCodeConfig?.name || message.animationName || 'AI Generated',
                          message.animationCodeConfig
                        );
                      }}
                      className={cn(
                        'mt-2 flex items-center gap-1.5 text-xs font-medium',
                        'px-3 py-1.5 rounded-lg transition-colors',
                        'bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400'
                      )}
                    >
                      <Film className="h-3 w-3" />
                      Add to Timeline
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{loadingMessage}</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Mode dropdown (floats above input) ──────── */}
          {showModeDropdown && (
            <div
              ref={dropdownRef}
              className="mx-3 mb-1 rounded-xl border bg-popover shadow-lg overflow-hidden"
            >
              {/* Compose option — only when Composer is active */}
              {isComposerActive && (
                <>
                  <button
                    onClick={switchToCompose}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-xs hover:bg-accent transition-colors',
                      'flex items-center gap-2',
                      mode === 'compose' && 'bg-accent'
                    )}
                  >
                    <Film className="h-3.5 w-3.5 text-violet-500" />
                    <span className="font-medium">Edit sequence</span>
                    {mode === 'compose' && <Check className="h-3 w-3 ml-auto text-violet-500" />}
                  </button>
                  <div className="border-t" />
                </>
              )}

              {/* Create new option */}
              <button
                onClick={switchToCreate}
                className={cn(
                  'w-full text-left px-3 py-2.5 text-xs hover:bg-accent transition-colors',
                  'flex items-center gap-2',
                  mode === 'create' && 'bg-accent'
                )}
              >
                <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-medium">Create new animation</span>
                {mode === 'create' && <Check className="h-3 w-3 ml-auto text-primary" />}
              </button>

              <div className="border-t" />

              {/* Search */}
              <div className="p-2">
                <Input
                  value={animationSearch}
                  onChange={(e) => setAnimationSearch(e.target.value)}
                  placeholder="Search existing animations..."
                  className="h-7 text-xs rounded-lg"
                  autoFocus
                />
              </div>

              {/* Animation list */}
              <div className="max-h-40 overflow-y-auto pb-1">
                {filteredAnimations.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No animations found
                  </p>
                ) : (
                  filteredAnimations.map((anim) => (
                    <button
                      key={anim.id}
                      onClick={() => switchToIterate(anim.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors',
                        'flex items-center gap-2',
                        anim.id === selectedAnimationId && mode === 'iterate' && 'bg-accent'
                      )}
                    >
                      <Pencil className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">{anim.name}</span>
                      {anim.id === selectedAnimationId && mode === 'iterate' && (
                        <Check className="h-3 w-3 ml-auto text-primary shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Input area ──────────────────────────────── */}
          <div className="px-3 py-3 border-t bg-muted/10">
            <div className="flex gap-1.5">
              {/* Mode toggle button */}
              <button
                onClick={() => {
                  setShowModeDropdown(!showModeDropdown);
                  setAnimationSearch('');
                }}
                disabled={isLoading}
                className={cn(
                  'shrink-0 h-9 rounded-xl text-xs font-medium px-2.5',
                  'flex items-center gap-1 transition-colors border',
                  'hover:bg-accent disabled:opacity-50',
                  mode === 'compose'
                    ? 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400'
                    : mode === 'iterate'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-background border-input text-muted-foreground'
                )}
              >
                {mode === 'compose' ? (
                  <Film className="h-3 w-3" />
                ) : mode === 'create' ? (
                  <Plus className="h-3 w-3" />
                ) : (
                  <Pencil className="h-3 w-3" />
                )}
                <span className="max-w-[80px] truncate">{modeLabel}</span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </button>

              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'compose'
                    ? 'Ask, create, or edit...'
                    : mode === 'iterate' && selectedAnimation
                      ? 'Describe changes...'
                      : 'Describe an animation...'
                }
                disabled={isLoading}
                className="h-9 text-sm rounded-xl"
              />
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="AI Chat (⌘K)"
        className={cn(
          'fixed bottom-6 right-6 z-50 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center gap-1.5 transition-all duration-200',
          'hover:scale-105 active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isOpen ? 'opacity-0 pointer-events-none scale-75 h-12 w-12 justify-center' : 'h-12 px-4'
        )}
      >
        <Sparkles className="h-5 w-5 shrink-0" />
        {!isOpen && (
          <kbd className="text-[10px] font-medium opacity-70 bg-primary-foreground/20 rounded px-1.5 py-0.5">
            ⌘K
          </kbd>
        )}
      </button>
    </>
  );
}
