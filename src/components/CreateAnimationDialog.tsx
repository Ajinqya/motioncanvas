import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { compileCustomCode, validateCustomCode, extractModuleConfig, CUSTOM_CODE_TEMPLATE } from '../runtime/custom-code';
import { Code, Sparkles, Loader2, AlertCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import type { CustomCodeConfig } from '../runtime/sequence';
import type { CloudAnimationInput } from '../lib/animation-cloud';

type Tab = 'code' | 'ai';

interface CreateAnimationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (input: CloudAnimationInput) => Promise<{ localId: string; error: Error | null }>;
}

export function CreateAnimationDialog({ open, onOpenChange, onSave }: CreateAnimationDialogProps) {
  const [tab, setTab] = useState<Tab>('code');
  const [code, setCode] = useState(CUSTOM_CODE_TEMPLATE);
  const [name, setName] = useState('My Animation');
  const [config, setConfig] = useState<CustomCodeConfig>({
    name: 'My Animation',
    width: 800,
    height: 600,
    durationMs: 3000,
    fps: 60,
    background: '#000000',
  });
  const [codeError, setCodeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiGeneratedCode, setAiGeneratedCode] = useState<string | null>(null);

  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRafRef = useRef<number | null>(null);

  useEffect(() => {
    if (open && tab === 'code') {
      setCodeError(null);
      const compiled = compileCustomCode(code, config);
      setCodeError(compiled ? null : validateCustomCode(code));
    }
  }, [open, tab, code, config]);

  // Live animation preview when code compiles successfully
  useEffect(() => {
    if (!open || tab !== 'code') {
      if (previewRafRef.current != null) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
      return;
    }

    const canvas = previewCanvasRef.current;
    if (!canvas) return;

    const compiledResult = compileCustomCode(code, config);
    if (!compiledResult) return;

    const previewCtx = canvas.getContext('2d');
    if (!previewCtx) return;

    const ctx = previewCtx;
    const canvasEl = canvas;
    const compiled = compiledResult;

    const w = config.width || 800;
    const h = config.height || 600;
    const previewScale = Math.min(280 / w, 160 / h);
    const displayW = Math.round(w * previewScale);
    const displayH = Math.round(h * previewScale);
    const dpr = window.devicePixelRatio || 1;
    canvasEl.width = Math.round(displayW * dpr);
    canvasEl.height = Math.round(displayH * dpr);
    canvasEl.style.width = `${displayW}px`;
    canvasEl.style.height = `${displayH}px`;

    const durationMs = config.durationMs || 3000;
    let startTime: number | null = null;

    function animate(timestamp: number) {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) % durationMs;
      const progress = elapsed / durationMs;

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.scale(previewScale * dpr, previewScale * dpr);

      compiled.render(ctx as unknown as CanvasRenderingContext2D, {
        width: w,
        height: h,
        progress,
      });
      ctx.restore();

      previewRafRef.current = requestAnimationFrame(animate);
    }

    previewRafRef.current = requestAnimationFrame(animate);

    return () => {
      if (previewRafRef.current != null) {
        cancelAnimationFrame(previewRafRef.current);
        previewRafRef.current = null;
      }
    };
  }, [open, tab, code, config]);

  const compiled = useMemo(() => compileCustomCode(code, config), [code, config]);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    const extracted = extractModuleConfig(newCode);
    if (extracted) setConfig(extracted);
  };

  const handleSaveFromCode = async () => {
    const compiled = compileCustomCode(code, config);
    if (!compiled) {
      setCodeError(validateCustomCode(code) ?? 'Invalid code');
      return;
    }
    setSaving(true);
    const { error } = await onSave({
      name: config.name ?? name,
      code,
      config: { ...config, name: config.name ?? name },
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Animation saved to your gallery');
    onOpenChange(false);
    setCode(CUSTOM_CODE_TEMPLATE);
    setConfig({ name: 'My Animation', width: 800, height: 600, durationMs: 3000, fps: 60, background: '#000000' });
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const apiKey = localStorage.getItem('openai-api-key');
      const res = await fetch('/api/chat-create-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: aiPrompt.trim() }],
          ...(apiKey && { apiKey }),
        }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setAiGeneratedCode(data.code);
        setTab('code');
        setCode(data.code);
        const extracted = extractModuleConfig(data.code);
        if (extracted) setConfig(extracted);
        toast.success('Generated! Review and save to your gallery.');
      } else {
        setAiError(data.error ?? 'Generation failed');
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTab('code');
    setAiPrompt('');
    setAiGeneratedCode(null);
    setAiError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create new animation</DialogTitle>
          <DialogDescription>Paste code or generate with AI, then save to your gallery.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={tab === 'code' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTab('code')}
            className="gap-2"
          >
            <Code className="h-4 w-4" />
            Paste code
          </Button>
          <Button
            variant={tab === 'ai' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTab('ai')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Generate with AI
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {tab === 'code' ? (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Name</Label>
                <Input
                  value={config.name ?? name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setConfig((c) => ({ ...c, name: e.target.value }));
                  }}
                  className="mt-1"
                  placeholder="My Animation"
                />
              </div>
              <div>
                <Label className="text-xs">Code</Label>
                <textarea
                  ref={codeTextareaRef}
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="w-full h-[200px] mt-1 rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  spellCheck={false}
                  placeholder="Paste animation code..."
                />
                {codeError && (
                  <div className="flex items-start gap-1.5 text-destructive text-xs mt-2">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span>{codeError}</span>
                  </div>
                )}
              </div>
              {compiled ? (
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    Preview — what will be added to your library
                  </Label>
                  <div className="rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center min-h-[160px]">
                    <canvas ref={previewCanvasRef} className="block" />
                  </div>
                </div>
              ) : code.trim() ? (
                <p className="text-xs text-muted-foreground">
                  Fix errors above to see a preview of your animation.
                </p>
              ) : null}
              <Button onClick={handleSaveFromCode} disabled={saving || !!codeError} className="w-full">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save to my gallery'
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Describe the animation</Label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full h-24 mt-1 rounded-lg border bg-muted/50 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="e.g. A pulsing neon circle that glows and fades..."
                />
              </div>
              {aiError && (
                <div className="text-destructive text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {aiError}
                </div>
              )}
              <Button onClick={handleAiGenerate} disabled={aiLoading || !aiPrompt.trim()} className="w-full">
                {aiLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate animation
                  </>
                )}
              </Button>
              {aiGeneratedCode && (
                <p className="text-xs text-muted-foreground">
                  Switched to Code tab. Review and click &quot;Save to my gallery&quot;.
                </p>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
