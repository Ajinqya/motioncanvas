import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { createPlayer, type PlayerControls } from '../runtime/player';
import { useAnimationRegistry, getAnimationById } from '../animations/registry';
import { ParameterPanel, useParameters } from '../components/ParameterPanel';
import { ExportPanel } from '../components/ExportPanel';
import type { AnimationEntry } from '../runtime/types';
import { isSimpleAnimation } from '../runtime/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Play, Pause, RotateCcw, Save, Download } from 'lucide-react';

export function Player() {
  const { id } = useParams<{ id: string }>();
  const animations = useAnimationRegistry();
  const [entry, setEntry] = useState<AnimationEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && animations.length > 0) {
      const found = getAnimationById(id);
      if (found) {
        setEntry(found);
        setError(null);
      } else {
        setError(`Animation "${id}" not found`);
      }
    }
  }, [id, animations]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-4">Error</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild>
              <Link to="/">Back to Gallery</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <PlayerView entry={entry} />;
}

function PlayerView({ entry }: { entry: AnimationEntry }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<PlayerControls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const { definition } = entry;
  const isSimple = isSimpleAnimation(definition);
  const durationSec = definition.durationMs
    ? definition.durationMs / 1000
    : undefined;

  // Use our custom parameter hook (only for full format animations)
  const { values: params, onChange: handleParamChange } = useParameters(
    isSimple ? {} : definition.params.schema,
    isSimple ? {} : definition.params.defaults
  );

  const handleFrame = useCallback((frame: number, time: number) => {
    setCurrentFrame(frame);
    setCurrentTime(time);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;

    playerRef.current = createPlayer({
      canvas: canvasRef.current,
      animation: definition,
      params,
      onFrame: handleFrame,
    });

    // Autoplay on load
    playerRef.current.play();
    setPlaying(true);

    return () => {
      playerRef.current?.destroy();
    };
  }, [definition]);

  // Update params when they change
  useEffect(() => {
    playerRef.current?.setParams(params);
  }, [params]);

  const togglePlay = () => {
    playerRef.current?.toggle();
    setPlaying(playerRef.current?.isPlaying() ?? false);
  };

  const restart = () => {
    playerRef.current?.restart();
    setCurrentTime(0);
    setCurrentFrame(0);
  };

  const handleSeek = (value: number[]) => {
    const time = value[0];
    playerRef.current?.seek(time);
  };

  const handleSaveDefaults = async () => {
    if (isSimple) return;
    
    setSaveStatus('saving');
    
    try {
      const response = await fetch('/api/save-defaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          animationId: definition.id,
          params,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save defaults');
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving defaults:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Sticky header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">{definition.name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isSimple && (
              <Button
                variant={saveStatus === 'success' ? 'default' : 'outline'}
                onClick={handleSaveDefaults}
                disabled={saveStatus === 'saving'}
              >
                <Save className="h-4 w-4" />
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'success' && 'Saved!'}
                {saveStatus === 'error' && 'Error'}
                {saveStatus === 'idle' && 'Save as Default'}
              </Button>
            )}
            <Button
              variant={showExport ? 'default' : 'outline'}
              onClick={() => setShowExport(!showExport)}
            >
              <Download className="h-4 w-4" />
              {showExport ? 'Hide Export' : 'Export'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Main content area - canvas fixed at center, no scroll */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full rounded-lg shadow-lg"
            style={{
              backgroundColor: definition.background || 'transparent',
            }}
          />
        </div>

        {/* Sidebar - only this scrolls */}
        <aside className="w-80 border-l bg-muted/30 overflow-y-auto flex-shrink-0 pb-20">
          <div className="p-4">
            {!isSimple && (
              <ParameterPanel
                schema={definition.params.schema}
                values={params}
                onChange={handleParamChange}
              />
            )}

            {showExport && (
              <div className="mt-4">
                <ExportPanel
                  entry={entry}
                  params={params}
                />
              </div>
            )}

            {entry.meta && (
              <>
                <Separator className="my-4" />
                <div>
                  <h3 className="font-semibold mb-3">Metadata</h3>
                  {entry.meta.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {entry.meta.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {entry.meta.prompt && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Prompt</h4>
                      <p className="text-sm text-muted-foreground">
                        {entry.meta.prompt}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Player controls - full width at bottom */}
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlay}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={restart}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            {durationSec && (
              <div className="flex-1">
                <Slider
                  min={0}
                  max={durationSec}
                  step={0.01}
                  value={[currentTime]}
                  onValueChange={handleSeek}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{currentTime.toFixed(2)}s</span>
              <span>|</span>
              <span>Frame {currentFrame}</span>
              <span>|</span>
              <span>{definition.fps ?? 60} FPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
