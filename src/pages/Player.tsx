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
import { ArrowLeft, Play, Pause, RotateCcw, Save, Download, Settings2, X, Music, Upload } from 'lucide-react';

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
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showExport, setShowExport] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [audioFileName, setAudioFileName] = useState<string | null>(null);

  const { definition } = entry;
  const isSimple = isSimpleAnimation(definition);
  const durationSec = definition.durationMs
    ? definition.durationMs / 1000
    : undefined;
  
  // Check if this is an audio-reactive animation
  const isAudioAnimation = entry.meta?.tags?.includes('audio') || 
    (!isSimple && definition.id?.startsWith('audio-'));

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
      audioEnabled: isAudioAnimation,
    });

    // Autoplay on load
    playerRef.current.play();
    setPlaying(true);

    return () => {
      playerRef.current?.destroy();
      setAudioLoaded(false);
      setAudioFileName(null);
    };
  }, [definition, isAudioAnimation]);

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

  const handleAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !playerRef.current) return;
    
    try {
      await playerRef.current.loadAudio(file);
      setAudioLoaded(true);
      setAudioFileName(file.name);
    } catch (error) {
      console.error('Failed to load audio:', error);
      setAudioLoaded(false);
      setAudioFileName(null);
    }
    
    // Reset input so the same file can be selected again
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
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
        <div className="container mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-lg sm:text-2xl font-bold truncate">{definition.name}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Audio upload for audio-reactive animations */}
            {isAudioAnimation && (
              <>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioUpload}
                  className="hidden"
                />
                <Button
                  variant={audioLoaded ? 'default' : 'outline'}
                  onClick={() => audioInputRef.current?.click()}
                  className="hidden sm:flex"
                >
                  {audioLoaded ? <Music className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                  <span className="hidden md:inline ml-2">
                    {audioLoaded ? audioFileName : 'Load Audio'}
                  </span>
                </Button>
              </>
            )}
            {/* Settings toggle for mobile */}
            <Button
              variant={sidebarOpen ? 'default' : 'outline'}
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />}
            </Button>
            {!isSimple && (
              <Button
                variant={saveStatus === 'success' ? 'default' : 'outline'}
                onClick={handleSaveDefaults}
                disabled={saveStatus === 'saving'}
                className="hidden sm:flex"
              >
                <Save className="h-4 w-4" />
                <span className="hidden md:inline">
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'success' && 'Saved!'}
                  {saveStatus === 'error' && 'Error'}
                  {saveStatus === 'idle' && 'Save as Default'}
                </span>
              </Button>
            )}
            <Button
              variant={showExport ? 'default' : 'outline'}
              onClick={() => setShowExport(!showExport)}
              className="hidden sm:flex"
            >
              <Download className="h-4 w-4" />
              <span className="hidden md:inline">{showExport ? 'Hide Export' : 'Export'}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* Main content area - canvas fixed at center, no scroll */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full rounded-lg shadow-lg"
            style={{
              backgroundColor: definition.background || 'transparent',
            }}
          />
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - slides in on mobile, fixed on desktop */}
        <aside
          className={`
            fixed lg:relative inset-y-0 right-0 z-50 lg:z-auto
            w-80 max-w-[85vw] border-l bg-background lg:bg-muted/30 
            overflow-y-auto flex-shrink-0 pb-20
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          `}
        >
          {/* Mobile header for sidebar */}
          <div className="lg:hidden sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background">
            <h2 className="font-semibold">Settings</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile action buttons */}
          <div className="lg:hidden p-4 border-b space-y-2">
            {isAudioAnimation && (
              <Button
                variant={audioLoaded ? 'default' : 'outline'}
                onClick={() => audioInputRef.current?.click()}
                className="w-full"
              >
                {audioLoaded ? <Music className="h-4 w-4 mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                {audioLoaded ? audioFileName : 'Load Audio'}
              </Button>
            )}
            {!isSimple && (
              <Button
                variant={saveStatus === 'success' ? 'default' : 'outline'}
                onClick={handleSaveDefaults}
                disabled={saveStatus === 'saving'}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveStatus === 'saving' && 'Saving...'}
                {saveStatus === 'success' && 'Saved!'}
                {saveStatus === 'error' && 'Error'}
                {saveStatus === 'idle' && 'Save as Default'}
              </Button>
            )}
            <Button
              variant={showExport ? 'default' : 'outline'}
              onClick={() => setShowExport(!showExport)}
              className="w-full"
            >
              <Download className="h-4 w-4 mr-2" />
              {showExport ? 'Hide Export' : 'Export'}
            </Button>
          </div>

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
      <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={togglePlay}
              className="flex-shrink-0"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={restart}
              className="flex-shrink-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            {durationSec && (
              <div className="flex-1 min-w-0">
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

            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0">
              <span>{currentTime.toFixed(2)}s</span>
              <span className="hidden sm:inline">|</span>
              <span className="hidden sm:inline">Frame {currentFrame}</span>
              <span className="hidden md:inline">|</span>
              <span className="hidden md:inline">{definition.fps ?? 60} FPS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
