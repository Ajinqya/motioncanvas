import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { createPlayer, type PlayerControls } from '../runtime/player';
import { ParameterPanel, useParameters } from '../components/ParameterPanel';
import { draftAnimation } from '../draft/animation';
import { isSimpleAnimation, type AnyAnimationDefinition } from '../runtime/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Play, Pause, RotateCcw, Info } from 'lucide-react';

export function Draft() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<PlayerControls | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);

  const definition = draftAnimation as AnyAnimationDefinition;
  const isSimple = isSimpleAnimation(definition);
  const durationSec = definition.durationMs
    ? definition.durationMs / 1000
    : undefined;

  // Use our custom parameter hook (only for full format)
  const { values: params, onChange: handleParamChange } = useParameters(
    isSimple ? {} : (definition as any).params.schema,
    isSimple ? {} : (definition as any).params.defaults
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

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Draft: {definition.name}</h1>
            <Badge variant="secondary">Draft Mode</Badge>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <Card className="w-full max-w-4xl">
            <CardContent className="p-6">
              <canvas
                ref={canvasRef}
                className="w-full h-auto rounded-lg"
                style={{
                  backgroundColor: definition.background || 'transparent',
                }}
              />

              <div className="mt-4 space-y-4">
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
            </CardContent>
          </Card>
        </div>

        <aside className="w-80 border-l bg-muted/30 overflow-y-auto">
          <div className="p-4 space-y-4">
            {!isSimple && (
              <ParameterPanel
                schema={(definition as any).params.schema}
                values={params}
                onChange={handleParamChange}
              />
            )}

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Draft Mode</h3>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Edit <code className="px-1.5 py-0.5 rounded bg-muted text-foreground">src/draft/animation.ts</code> to iterate on your animation. Changes will hot-reload automatically.
                  </p>
                  <p>
                    Once you're happy with the result, run:
                  </p>
                  <code className="block px-3 py-2 rounded bg-muted text-foreground">
                    npm run promote -- --id your-id
                  </code>
                  <p>
                    to add it to the gallery.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
