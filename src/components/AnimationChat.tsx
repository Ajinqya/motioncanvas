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
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Display-only content (what the user sees — without injected source code) */
  displayContent?: string;
  animationId?: string;
  animationPath?: string;
  animationName?: string;
  isError?: boolean;
}

interface AnimationInfo {
  id: string;
  name: string;
  source: string;
}

type ChatMode = 'create' | 'iterate';

const API_KEY_STORAGE_KEY = 'openai-api-key';

// ── Component ────────────────────────────────────────────────
export function AnimationChat() {
  const navigate = useNavigate();
  const location = useLocation();

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
  // When opening chat on an animation page, default to iterate mode
  useEffect(() => {
    if (!isOpen) return;

    if (routeAnimationId && animations.length > 0) {
      const found = animations.find((a) => a.id === routeAnimationId);
      if (found) {
        setMode('iterate');
        setSelectedAnimationId(routeAnimationId);
      }
    } else if (!routeAnimationId && messages.length === 0) {
      // On gallery, default to create
      setMode('create');
      setSelectedAnimationId(null);
    }
  }, [isOpen, routeAnimationId, animations.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effects ──────────────────────────────────────────────
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

  // Fetch animation list when panel opens
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/animations-list')
      .then((res) => res.json())
      .then((data: AnimationInfo[]) => setAnimations(data))
      .catch(() => {});
  }, [isOpen]);

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

    // Build the full message content with animation context injected
    let fullContent = trimmed;
    if (mode === 'iterate' && selectedAnimation) {
      fullContent = `[EXISTING ANIMATION: ${selectedAnimation.id}]\n${selectedAnimation.source}\n[END ANIMATION]\n\n${trimmed}`;
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

      const payload: Record<string, unknown> = { messages: history };
      if (apiKey) payload.apiKey = apiKey;

      const response = await fetch('/api/chat-create-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes('API key')) setShowApiKeyInput(true);
        throw new Error(data.error || 'Request failed');
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || data.description || 'Animation created!',
        animationId: data.success ? data.id : undefined,
        animationPath: data.success ? data.path : undefined,
        animationName: data.success ? data.name : undefined,
        isError: !data.success,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Auto-switch to iterate mode on the new/updated animation
      if (data.success && data.id) {
        fetch('/api/animations-list')
          .then((res) => res.json())
          .then((list: AnimationInfo[]) => {
            setAnimations(list);
            setSelectedAnimationId(data.id);
            setMode('iterate');
          })
          .catch(() => {});
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
  }, [input, isLoading, apiKey, messages, mode, selectedAnimation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearMessages = () => {
    setMessages([]);
    // Reset mode based on current route
    if (routeAnimationId) {
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

  // ── Mode label for the toggle button ─────────────────────
  const modeLabel =
    mode === 'create'
      ? 'New'
      : selectedAnimation
        ? selectedAnimation.name.length > 16
          ? selectedAnimation.name.slice(0, 16) + '...'
          : selectedAnimation.name
        : 'Edit';

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
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold leading-none">Animation Creator</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mode === 'create' ? 'Creating new animation' : `Editing "${selectedAnimation?.name ?? '...'}"`}
                </p>
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
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                {mode === 'iterate' && selectedAnimation ? (
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
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {mode === 'iterate' && selectedAnimation
                        ? `Updating "${selectedAnimation.name}"...`
                        : 'Generating animation...'}
                    </span>
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
                  mode === 'iterate'
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-background border-input text-muted-foreground'
                )}
              >
                {mode === 'create' ? (
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
                  mode === 'iterate' && selectedAnimation
                    ? `Describe changes...`
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
        className={cn(
          'fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'hover:scale-105 active:scale-95 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          isOpen && 'opacity-0 pointer-events-none scale-75'
        )}
      >
        <Sparkles className="h-5 w-5" />
      </button>
    </>
  );
}
