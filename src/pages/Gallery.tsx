import { useMemo, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAnimationRegistry } from '../animations/registry';
import { useDeletedAnimations } from '../hooks/useDeletedAnimations';
import { useAnimationTabs } from '../hooks/useAnimationTabs';
import { AnimationThumbnail } from '../components/AnimationThumbnail';
import { ThemeToggle } from '../components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Trash2, Copy, Check, Plus, FolderInput, MoreVertical, Save } from 'lucide-react';
import { toast } from 'sonner';

function getAnimationId(entry: { definition: any }) {
  return 'id' in entry.definition
    ? entry.definition.id
    : 'name' in entry.definition && entry.definition.name
      ? entry.definition.name.toLowerCase().replace(/\s+/g, '-')
      : 'animation';
}

export function Gallery() {
  const animations = useAnimationRegistry();
  const { deleteAnimation, isDeleted } = useDeletedAnimations();
  const {
    allTabs,
    tabs,
    addTab,
    deleteTab,
    getAnimationTab,
    moveAnimationToTab,
    saveAsDefault,
  } = useAnimationTabs();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [animationToDelete, setAnimationToDelete] = useState<{ id: string; name: string } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string>('all');

  // New tab dialog
  const [newTabOpen, setNewTabOpen] = useState(false);
  const [newTabName, setNewTabName] = useState('');

  // Delete tab dialog
  const [deleteTabOpen, setDeleteTabOpen] = useState(false);

  // Save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Drag & drop state
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  // ── Filtered animations ──────────────────────────────────────
  const visibleAnimations = animations.filter((entry) => !isDeleted(getAnimationId(entry)));

  const filteredAnimations = useMemo(() => {
    if (selectedTabId === 'all') return visibleAnimations;
    return visibleAnimations.filter((entry) => getAnimationTab(getAnimationId(entry)) === selectedTabId);
  }, [visibleAnimations, selectedTabId, getAnimationTab]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleCopyCode = async (e: React.MouseEvent, entry: typeof animations[0]) => {
    e.preventDefault();
    e.stopPropagation();
    const id = getAnimationId(entry);
    if (entry.source) {
      try {
        await navigator.clipboard.writeText(entry.source);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setAnimationToDelete({ id, name });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (animationToDelete) {
      deleteAnimation(animationToDelete.id);
      setDeleteDialogOpen(false);
      setAnimationToDelete(null);
    }
  };

  const handleCreateTab = () => {
    if (newTabName.trim().length === 0) return;
    const tab = addTab(newTabName);
    setSelectedTabId(tab.id);
    setNewTabName('');
    setNewTabOpen(false);
  };

  const handleDeleteTab = (tabId: string) => {
    deleteTab(tabId);
    if (selectedTabId === tabId) setSelectedTabId('all');
  };

  const handleSaveAsDefault = async () => {
    setSaveStatus('saving');
    const ok = await saveAsDefault();
    setSaveStatus(ok ? 'success' : 'error');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // ── Toast helper for tab moves ────────────────────────────────
  const notifyMove = useCallback(
    (animName: string, tabId: string | null) => {
      if (!tabId) {
        toast.success(`Moved "${animName}" back to All`);
      } else {
        const tabName = allTabs.find((t) => t.id === tabId)?.name ?? tabId;
        toast.success(`Moved "${animName}" to ${tabName}`);
      }
    },
    [allTabs],
  );

  // ── Drag & drop helpers ──────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, animId: string) => {
    e.dataTransfer.setData('text/plain', animId);
    e.dataTransfer.effectAllowed = 'move';

    // Build a small 24px-tall custom drag image so it's easy to target tabs
    const entry = visibleAnimations.find((a) => getAnimationId(a) === animId);
    const label =
      entry && 'name' in entry.definition && entry.definition.name
        ? entry.definition.name
        : animId;

    const ghost = document.createElement('div');
    ghost.textContent = label;
    ghost.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;height:24px;line-height:24px;padding:0 10px;' +
      'border-radius:6px;font-size:12px;font-weight:500;white-space:nowrap;' +
      'background:hsl(var(--primary));color:hsl(var(--primary-foreground));' +
      'display:flex;align-items:center;pointer-events:none;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 12);
    // Clean up the ghost element after the browser captures it
    requestAnimationFrame(() => {
      document.body.removeChild(ghost);
      setDraggingId(animId);
    });
  }, [visibleAnimations]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverTabId(null);
    dragCounterRef.current = {};
  }, []);

  const handleTabDragEnter = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    dragCounterRef.current[tabId] = (dragCounterRef.current[tabId] || 0) + 1;
    setDragOverTabId(tabId);
  }, []);

  const handleTabDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleTabDragLeave = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    dragCounterRef.current[tabId] = (dragCounterRef.current[tabId] || 0) - 1;
    if (dragCounterRef.current[tabId] <= 0) {
      dragCounterRef.current[tabId] = 0;
      setDragOverTabId((prev) => (prev === tabId ? null : prev));
    }
  }, []);

  const handleTabDrop = useCallback(
    (e: React.DragEvent, tabId: string) => {
      e.preventDefault();
      const animId = e.dataTransfer.getData('text/plain');
      if (animId) {
        const targetTab = tabId === 'all' ? null : tabId;
        moveAnimationToTab(animId, targetTab);
        // Find the animation name for the toast
        const entry = visibleAnimations.find((a) => getAnimationId(a) === animId);
        const animName =
          entry && 'name' in entry.definition && entry.definition.name
            ? entry.definition.name
            : animId;
        notifyMove(animName, targetTab);
      }
      setDraggingId(null);
      setDragOverTabId(null);
      dragCounterRef.current = {};
    },
    [moveAnimationToTab, visibleAnimations, notifyMove],
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <header className="border-b">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">Canvas Animation Lab</h1>
            <ThemeToggle />
          </div>
        </header>

        {/* ── Tab bar ─────────────────────────────────────── */}
        <div className="border-b">
          <div className="container mx-auto px-6 py-3 flex items-center gap-2">
          {/* Scrollable tab buttons */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-0 min-w-0">
            {allTabs.map((tab) => {
              const active = tab.id === selectedTabId;
              const isDropTarget = dragOverTabId === tab.id && draggingId !== null;
              return (
                <Button
                  key={tab.id}
                  variant={active ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTabId(tab.id)}
                  onDragEnter={(e) => handleTabDragEnter(e, tab.id)}
                  onDragOver={handleTabDragOver}
                  onDragLeave={(e) => handleTabDragLeave(e, tab.id)}
                  onDrop={(e) => handleTabDrop(e, tab.id)}
                  className={`whitespace-nowrap transition-all ${
                    isDropTarget
                      ? 'ring-2 ring-primary ring-offset-2 scale-105 bg-primary/10'
                      : ''
                  }`}
                >
                  {tab.name}
                </Button>
              );
            })}
          </div>

          {/* Sticky 3-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="flex-shrink-0 h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Tabs</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { setNewTabName(''); setNewTabOpen(true); }}>
                <Plus className="h-4 w-4" />
                Create new tab
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteTabOpen(true)}
                disabled={tabs.length === 0}
              >
                <Trash2 className="h-4 w-4" />
                Delete tab
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSaveAsDefault} disabled={saveStatus === 'saving'}>
                <Save className="h-4 w-4" />
                {saveStatus === 'saving'
                  ? 'Saving...'
                  : saveStatus === 'success'
                    ? 'Saved!'
                    : saveStatus === 'error'
                      ? 'Error saving'
                      : 'Save as default'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8">
        {/* ── Grid ──────────────────────────────────────────── */}
        {visibleAnimations.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <p className="text-xl text-muted-foreground mb-4">No animations yet.</p>
            <p className="text-muted-foreground">
              Request an animation to get started.
            </p>
          </div>
        ) : filteredAnimations.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <p className="text-lg text-muted-foreground mb-2">No animations in this tab.</p>
            <p className="text-sm text-muted-foreground">
              Drag animations here from the <strong>All</strong> tab, or use the folder icon on each card.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {filteredAnimations.map((entry) => {
              const id = getAnimationId(entry);
              const name =
                'name' in entry.definition && entry.definition.name
                  ? entry.definition.name
                  : 'Unnamed Animation';
              const isCopied = copiedId === id;
              const assignedTab = getAnimationTab(id) ?? '';
              const isDragging = draggingId === id;

              return (
                <Link
                  key={id}
                  to={`/a/${id}`}
                  className={`block mb-4 break-inside-avoid transition-opacity ${
                    isDragging ? 'opacity-40' : ''
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, id)}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="group relative rounded-lg overflow-hidden border bg-card">
                    <div
                      className="w-full"
                      style={{
                        backgroundColor: entry.definition.background || 'hsl(var(--muted))',
                        aspectRatio: `${entry.definition.width ?? 800} / ${entry.definition.height ?? 600}`,
                      }}
                    >
                      <AnimationThumbnail animation={entry.definition} isPlaying={hoveredId === id} />
                    </div>

                    {/* Action buttons - top right */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-8 w-8 shadow-md"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <FolderInput className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Move to tab</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuRadioGroup
                            value={assignedTab}
                            onValueChange={(value) => {
                              const targetTab = value || null;
                              moveAnimationToTab(id, targetTab);
                              notifyMove(name, targetTab);
                            }}
                          >
                            <DropdownMenuRadioItem value="">
                              Uncategorized
                            </DropdownMenuRadioItem>
                            {allTabs
                              .filter((t) => t.id !== 'all')
                              .map((t) => (
                                <DropdownMenuRadioItem key={t.id} value={t.id}>
                                  {t.name}
                                </DropdownMenuRadioItem>
                              ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8 shadow-md"
                        onClick={(e) => handleCopyCode(e, entry)}
                        disabled={!entry.source}
                      >
                        {isCopied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="destructive"
                        size="icon"
                        className="h-8 w-8 shadow-md"
                        onClick={(e) => handleDeleteClick(e, id, name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Title - bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <h3 className="text-white font-medium text-sm truncate">{name}</h3>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* ── Delete animation dialog ─────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Animation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{animationToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create tab dialog ───────────────────────────────── */}
      <Dialog open={newTabOpen} onOpenChange={setNewTabOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create tab</DialogTitle>
            <DialogDescription>
              Add a new tab to organize animations. You can drag animations into it from the gallery.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="new-tab-name">Tab name</Label>
            <Input
              id="new-tab-name"
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              placeholder="e.g. Transitions"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateTab();
                }
              }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTabOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTab} disabled={newTabName.trim().length === 0}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete tab dialog ───────────────────────────────── */}
      <Dialog open={deleteTabOpen} onOpenChange={setDeleteTabOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tab</DialogTitle>
            <DialogDescription>
              Choose a tab to delete. Animations in the tab will be moved back to All.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {tabs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tabs to delete.</p>
            ) : (
              tabs.map((tab) => (
                <div
                  key={tab.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm font-medium">{tab.name}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteTab(tab.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTabOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
