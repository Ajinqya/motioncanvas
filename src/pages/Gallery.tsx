import { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAnimationRegistry } from '../animations/registry';
import { useDeletedAnimations } from '../hooks/useDeletedAnimations';
import { useAnimationTabs } from '../hooks/useAnimationTabs';
import { useSequenceTabs } from '../hooks/useSequenceTabs';
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
import { Trash2, Copy, Check, Plus, FolderInput, MoreVertical, Save, Clapperboard, Search, LogIn, User, LogOut, Globe, Lock, Sparkles, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { listPublicSequencesCloud, loadPublicSequenceCloud } from '../lib/sequence-cloud';
import { listPublicAnimationsCloud } from '../lib/animation-cloud';
import type { Sequence } from '../runtime/sequence';
import { SequenceThumbnail } from '../components/SequenceThumbnail';
import { AuthDialog } from '../components/AuthDialog';
import { CreateAnimationDialog } from '../components/CreateAnimationDialog';
import { CloudAnimationCard } from '@/components/CloudAnimationCard';
import {
  listSavedSequences,
  loadSequence,
  deleteSavedSequence,
  saveSequence,
  exportSequenceFile,
  importSequenceFile,
  type SavedSequenceMeta,
} from '../runtime/sequence-storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAnimationId(entry: { definition: any }) {
  return 'id' in entry.definition
    ? entry.definition.id
    : 'name' in entry.definition && entry.definition.name
      ? entry.definition.name.toLowerCase().replace(/\s+/g, '-')
      : 'animation';
}

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}:${sec.toFixed(1).padStart(4, '0')}` : `${sec.toFixed(1)}s`;
}

function SequenceCard({
  meta,
  isHovered,
  loadSequence,
  assignedTab,
  allTabs,
  onOpen,
  onExport,
  onDelete,
  onPromote,
  onDemote,
  onMoveToTab,
  isDragging,
  draggable,
  onDragStart,
  onDragEnd,
  viewOnly,
  canPromote,
  creatorEmail,
}: {
  meta: SavedSequenceMeta;
  isHovered: boolean;
  loadSequence: (id: string) => Promise<Sequence | null>;
  assignedTab: string;
  allTabs: { id: string; name: string }[];
  onOpen: () => void;
  onExport: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onPromote?: (e: React.MouseEvent) => void;
  onDemote?: (e: React.MouseEvent) => void;
  onMoveToTab: (tabId: string | null) => void;
  isDragging?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  viewOnly?: boolean;
  canPromote?: boolean;
  creatorEmail?: string;
}) {
  const [seq, setSeq] = useState<Sequence | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSequence(meta.id).then((result) => {
      if (!cancelled && result) setSeq(result);
    });
    return () => { cancelled = true; };
  }, [meta.id, loadSequence]);

  return (
    <div
      className={`group relative rounded-lg overflow-hidden bg-card shadow-sm mb-4 break-inside-avoid cursor-pointer transition-opacity hover:opacity-95 ${isDragging ? 'opacity-40' : ''}`}
      onClick={onOpen}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div
        className="w-full"
        style={{
          backgroundColor: 'hsl(var(--muted))',
          aspectRatio: `${meta.width} / ${meta.height}`,
        }}
      >
        {seq ? (
          <SequenceThumbnail sequence={seq} isPlaying={isHovered} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            Loading...
          </div>
        )}
      </div>

      {!viewOnly && (
        <div className="absolute top-2 right-2 flex gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 shadow-md"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <FolderInput className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuLabel>Move to tab</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={assignedTab} onValueChange={(v) => onMoveToTab(v || null)}>
                <DropdownMenuRadioItem value="">Uncategorized</DropdownMenuRadioItem>
                {allTabs.filter((t) => t.id !== 'all').map((t) => (
                  <DropdownMenuRadioItem key={t.id} value={t.id}>{t.name}</DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 shadow-md"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(); }}>
                Open in Composer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                Export JSON
              </DropdownMenuItem>
              {canPromote && !meta.isPublic && onPromote && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPromote(e); }}>
                  <Globe className="h-4 w-4 mr-2" />
                  Make public
                </DropdownMenuItem>
              )}
              {canPromote && meta.isPublic && onDemote && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDemote(e); }}>
                  <Lock className="h-4 w-4 mr-2" />
                  Make private
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
        <h3 className="text-white font-medium text-sm truncate">{meta.name}</h3>
        <p className="text-white/80 text-xs flex items-center gap-2 flex-wrap">
          <span>{meta.sceneCount} scene{meta.sceneCount !== 1 ? 's' : ''} · {formatTime(meta.durationMs)}</span>
          {meta.isPublic ? (
            <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</span>
          ) : (
            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
          )}
          {creatorEmail && <span className="block w-full mt-0.5 truncate">{creatorEmail}</span>}
        </p>
      </div>
    </div>
  );
}

type GalleryTab = 'animations' | 'sequences';

export function Gallery() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const galleryTab = (searchParams.get('tab') as GalleryTab) || 'animations';
  const setGalleryTab = useCallback(
    (tab: GalleryTab) => setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('tab', tab);
      return next;
    }, { replace: true }),
    [setSearchParams]
  );

  const animations = useAnimationRegistry();
  const { deleteAnimation, isDeleted } = useDeletedAnimations();
  const auth = useAuth();
  const workspace = useWorkspace();
  const isAnonymous = auth.isConfigured && !auth.user;
  const {
    allTabs,
    tabs,
    addTab,
    deleteTab,
    getAnimationTab,
    moveAnimationToTab,
    saveAsDefault,
  } = useAnimationTabs();
  const {
    allTabs: sequenceAllTabs,
    tabs: sequenceTabs,
    addTab: addSequenceTab,
    deleteTab: deleteSequenceTab,
    getSequenceTab,
    moveSequenceToTab,
  } = useSequenceTabs();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [animationToDelete, setAnimationToDelete] = useState<{ id: string; name: string } | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedTabId, setSelectedTabId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  // ── Sequences (Sequence gallery tab) ────────────────────────
  const useCloud = workspace.useCloud;
  const [localSequences, setLocalSequences] = useState<SavedSequenceMeta[]>(() => listSavedSequences());
  const [publicSequences, setPublicSequences] = useState<SavedSequenceMeta[]>([]);
  const [publicSequencesLoading, setPublicSequencesLoading] = useState(false);
  const [sequenceDeleteDialogOpen, setSequenceDeleteDialogOpen] = useState(false);
  const [sequenceToDelete, setSequenceToDelete] = useState<SavedSequenceMeta | null>(null);
  const [sequenceDeleting, setSequenceDeleting] = useState(false);
  const [sequenceHoveredId, setSequenceHoveredId] = useState<string | null>(null);
  const [sequenceSearchQuery, setSequenceSearchQuery] = useState('');
  const [sequenceSelectedTabId, setSequenceSelectedTabId] = useState<string>('all');
  const [sequenceNewTabOpen, setSequenceNewTabOpen] = useState(false);
  const [sequenceNewTabName, setSequenceNewTabName] = useState('');
  const [sequenceDeleteTabOpen, setSequenceDeleteTabOpen] = useState(false);
  const [sequenceDraggingId, setSequenceDraggingId] = useState<string | null>(null);
  const [sequenceDragOverTabId, setSequenceDragOverTabId] = useState<string | null>(null);
  const sequenceDragCounterRef = useRef<Record<string, number>>({});
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const sequenceImportRef = useRef<HTMLInputElement>(null);
  const animTabsScrollRef = useRef<HTMLDivElement>(null);
  const seqTabsScrollRef = useRef<HTMLDivElement>(null);
  const [animTabsScrollState, setAnimTabsScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [seqTabsScrollState, setSeqTabsScrollState] = useState({ canScrollLeft: false, canScrollRight: false });

  const updateScrollState = useCallback((el: HTMLDivElement | null, setter: (s: { canScrollLeft: boolean; canScrollRight: boolean }) => void) => {
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setter({
      canScrollLeft: scrollLeft > 0,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 1,
    });
  }, []);

  const scrollTabs = useCallback((ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right', setter: (s: { canScrollLeft: boolean; canScrollRight: boolean }) => void) => {
    const el = ref.current;
    if (!el) return;
    const step = 120;
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
    setTimeout(() => updateScrollState(el, setter), 300);
  }, [updateScrollState]);

  useEffect(() => {
    const ra = animTabsScrollRef.current;
    const rs = seqTabsScrollRef.current;
    updateScrollState(ra, setAnimTabsScrollState);
    updateScrollState(rs, setSeqTabsScrollState);
    const onScroll = () => {
      updateScrollState(ra, setAnimTabsScrollState);
      updateScrollState(rs, setSeqTabsScrollState);
    };
    ra?.addEventListener('scroll', onScroll);
    rs?.addEventListener('scroll', onScroll);
    const ro = new ResizeObserver(() => {
      updateScrollState(ra, setAnimTabsScrollState);
      updateScrollState(rs, setSeqTabsScrollState);
    });
    if (ra) ro.observe(ra);
    if (rs) ro.observe(rs);
    return () => {
      ra?.removeEventListener('scroll', onScroll);
      rs?.removeEventListener('scroll', onScroll);
      ro.disconnect();
    };
  }, [updateScrollState, allTabs.length, sequenceAllTabs.length, galleryTab]);

  // Header size kept constant on scroll (no compact mode).
  const headerCompact = false;

  // Public/private view toggle – shared across both gallery tabs (animations and sequences)
  // Signed-in users default to Private (their workspace); anonymous users default to Public
  type ViewMode = 'public' | 'private';
  const viewMode = (searchParams.get('view') as ViewMode) || (isAnonymous ? 'public' : 'private');
  const setViewMode = useCallback(
    (mode: ViewMode) => setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set('view', mode);
      return next;
    }, { replace: true }),
    [setSearchParams]
  );

  // Create animation dialog
  const [createAnimOpen, setCreateAnimOpen] = useState(false);

  // Public animations (for public view)
  const [publicAnimations, setPublicAnimations] = useState<import('../lib/animation-cloud').CloudAnimationMeta[]>([]);
  const [publicAnimationsLoading, setPublicAnimationsLoading] = useState(false);

  useEffect(() => {
    if (viewMode !== 'public' && !isAnonymous) return;
    setPublicSequencesLoading(true);
    listPublicSequencesCloud().then(({ data }) => {
      setPublicSequences(data);
      setPublicSequencesLoading(false);
    });
  }, [viewMode, isAnonymous]);

  useEffect(() => {
    if (viewMode !== 'public') return;
    setPublicAnimationsLoading(true);
    listPublicAnimationsCloud().then(({ data }) => {
      setPublicAnimations(data);
      setPublicAnimationsLoading(false);
    });
  }, [viewMode]);

  const sequences =
    (viewMode === 'public' || isAnonymous) ? publicSequences
    : useCloud ? workspace.sequences
    : localSequences;

  const filteredSequences = useMemo(() => {
    let list = sequences;
    if (sequenceSelectedTabId !== 'all') {
      list = list.filter((m) => getSequenceTab(m.id) === sequenceSelectedTabId);
    }
    const q = sequenceSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q));
    }
    return list;
  }, [sequences, sequenceSelectedTabId, sequenceSearchQuery, getSequenceTab]);

  const sequenceTabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: sequences.length };
    for (const m of sequences) {
      const tabId = getSequenceTab(m.id);
      if (tabId) {
        counts[tabId] = (counts[tabId] || 0) + 1;
      }
    }
    return counts;
  }, [sequences, getSequenceTab]);

  const notifySequenceMove = useCallback(
    (seqName: string, tabId: string | null) => {
      if (!tabId) toast.success(`Moved "${seqName}" back to All`);
      else {
        const tabName = sequenceAllTabs.find((t) => t.id === tabId)?.name ?? tabId;
        toast.success(`Moved "${seqName}" to ${tabName}`);
      }
    },
    [sequenceAllTabs],
  );

  const refreshSequences = useCallback(() => {
    if (viewMode === 'public' || isAnonymous) {
      listPublicSequencesCloud().then(({ data }) => setPublicSequences(data));
    } else if (useCloud) {
      workspace.refreshSequences();
    } else {
      setLocalSequences(listSavedSequences());
    }
  }, [viewMode, isAnonymous, useCloud, workspace]);

  const refreshAnimations = useCallback(() => {
    if (viewMode === 'public') {
      listPublicAnimationsCloud().then(({ data }) => setPublicAnimations(data));
    } else if (useCloud) {
      workspace.refreshAnimations();
    }
  }, [viewMode, useCloud, workspace]);

  const loadSequenceById = useCallback(
    async (id: string): Promise<Sequence | null> => {
      if (isAnonymous || viewMode === 'public') {
        const { data } = await loadPublicSequenceCloud(id);
        return data;
      }
      if (useCloud) return workspace.loadSequence(id);
      return loadSequence(id);
    },
    [isAnonymous, viewMode, useCloud, workspace]
  );

  const handleSequenceOpen = useCallback(
    (meta: SavedSequenceMeta) => {
      if (isAnonymous) {
        navigate(`/s/${meta.id}`);
      } else {
        navigate(`/compose?open=${meta.id}`);
      }
    },
    [navigate, isAnonymous]
  );

  const handleSequenceDeleteClick = useCallback((e: React.MouseEvent, meta: SavedSequenceMeta) => {
    e.preventDefault();
    e.stopPropagation();
    setSequenceToDelete(meta);
    setSequenceDeleteDialogOpen(true);
  }, []);

  const confirmSequenceDelete = useCallback(async () => {
    if (!sequenceToDelete) return;
    setSequenceDeleting(true);
    try {
      if (useCloud) {
        const { error } = await workspace.deleteSequence(sequenceToDelete.id);
        if (error) {
          toast.error(error.message);
          return;
        }
      } else {
        deleteSavedSequence(sequenceToDelete.id);
      }
      refreshSequences();
      toast.success(`Deleted "${sequenceToDelete.name}"`);
    } finally {
      setSequenceDeleting(false);
      setSequenceDeleteDialogOpen(false);
      setSequenceToDelete(null);
    }
  }, [sequenceToDelete, refreshSequences, useCloud, workspace]);

  const handleSequenceExport = useCallback(
    async (e: React.MouseEvent, meta: SavedSequenceMeta) => {
      e.preventDefault();
      e.stopPropagation();
      const seq = await loadSequenceById(meta.id);
      if (seq) {
        exportSequenceFile(seq);
        toast.success(`Exported "${meta.name}"`);
      } else {
        toast.error('Failed to load sequence');
      }
    },
    [loadSequenceById]
  );

  const handleSequencePromote = useCallback(
    async (e: React.MouseEvent, meta: SavedSequenceMeta) => {
      e.preventDefault();
      e.stopPropagation();
      if (!useCloud) return;
      const { error } = await workspace.promoteSequence(meta.id);
      if (error) toast.error(error.message);
      else {
        refreshSequences();
        toast.success(`"${meta.name}" is now public`);
      }
    },
    [useCloud, workspace, refreshSequences]
  );

  const handleSequenceDemote = useCallback(
    async (e: React.MouseEvent, meta: SavedSequenceMeta) => {
      e.preventDefault();
      e.stopPropagation();
      if (!useCloud) return;
      const { error } = await workspace.demoteSequence(meta.id);
      if (error) toast.error(error.message);
      else {
        refreshSequences();
        toast.success(`"${meta.name}" is now private`);
      }
    },
    [useCloud, workspace, refreshSequences]
  );

  const handleSequenceImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const seq = await importSequenceFile(file);
      if (seq) {
        if (useCloud) {
          const { error } = await workspace.saveSequence(seq);
          if (error) {
            toast.error(error.message);
            return;
          }
        } else {
          saveSequence(seq);
        }
        refreshSequences();
        toast.success(`Imported "${seq.name}"`);
        navigate(`/compose?open=${seq.id}`);
      } else {
        toast.error('Invalid sequence file');
      }
      e.target.value = '';
    },
    [refreshSequences, navigate, useCloud, workspace]
  );

  const handleSequenceCreateTab = () => {
    if (sequenceNewTabName.trim().length === 0) return;
    const newTab = addSequenceTab(sequenceNewTabName);
    setSequenceSelectedTabId(newTab.id);
    setSequenceNewTabName('');
    setSequenceNewTabOpen(false);
  };

  const handleSequenceDeleteTab = (tabId: string) => {
    deleteSequenceTab(tabId);
    if (sequenceSelectedTabId === tabId) setSequenceSelectedTabId('all');
  };

  const handleSequenceDragStart = useCallback((e: React.DragEvent, seqId: string) => {
    e.dataTransfer.setData('text/plain', seqId);
    e.dataTransfer.effectAllowed = 'move';
    const meta = sequences.find((m) => m.id === seqId);
    const label = meta?.name ?? seqId;
    const ghost = document.createElement('div');
    ghost.textContent = label;
    ghost.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;height:24px;line-height:24px;padding:0 10px;border-radius:6px;font-size:12px;font-weight:500;white-space:nowrap;background:hsl(var(--primary));color:hsl(var(--primary-foreground));display:flex;align-items:center;pointer-events:none;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 12);
    requestAnimationFrame(() => {
      document.body.removeChild(ghost);
      setSequenceDraggingId(seqId);
    });
  }, [sequences]);

  const handleSequenceDragEnd = useCallback(() => {
    setSequenceDraggingId(null);
    setSequenceDragOverTabId(null);
    sequenceDragCounterRef.current = {};
  }, []);

  const handleSequenceTabDragEnter = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    sequenceDragCounterRef.current[tabId] = (sequenceDragCounterRef.current[tabId] || 0) + 1;
    setSequenceDragOverTabId(tabId);
  }, []);

  const handleSequenceTabDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleSequenceTabDragLeave = useCallback((e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    sequenceDragCounterRef.current[tabId] = (sequenceDragCounterRef.current[tabId] || 0) - 1;
    if (sequenceDragCounterRef.current[tabId] <= 0) {
      sequenceDragCounterRef.current[tabId] = 0;
      setSequenceDragOverTabId((prev) => (prev === tabId ? null : prev));
    }
  }, []);

  const handleSequenceTabDrop = useCallback(
    (e: React.DragEvent, tabId: string) => {
      e.preventDefault();
      const seqId = e.dataTransfer.getData('text/plain');
      if (seqId) {
        const targetTab = tabId === 'all' ? null : tabId;
        moveSequenceToTab(seqId, targetTab);
        const meta = sequences.find((m) => m.id === seqId);
        notifySequenceMove(meta?.name ?? seqId, targetTab);
      }
      setSequenceDraggingId(null);
      setSequenceDragOverTabId(null);
      sequenceDragCounterRef.current = {};
    },
    [moveSequenceToTab, sequences, notifySequenceMove],
  );

  // ── Filtered animations ──────────────────────────────────────
  const registryAnimations = animations.filter((entry) => !isDeleted(getAnimationId(entry)));
  const cloudAnimationsForView =
    viewMode === 'public' ? publicAnimations
    : !isAnonymous && useCloud ? workspace.animations
    : [];

  const filteredRegistryAnimations = useMemo(() => {
    let list = registryAnimations;
    // Filter by tab
    if (selectedTabId !== 'all') {
      list = list.filter((entry) => getAnimationTab(getAnimationId(entry)) === selectedTabId);
    }
    // Filter by search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((entry) => {
        const id = getAnimationId(entry).toLowerCase();
        const name =
          'name' in entry.definition && entry.definition.name
            ? String(entry.definition.name).toLowerCase()
            : '';
        const tags = entry.meta?.tags?.join(' ').toLowerCase() ?? '';
        return name.includes(q) || id.includes(q) || tags.includes(q);
      });
    }
    return list;
  }, [registryAnimations, selectedTabId, getAnimationTab, searchQuery]);

  const filteredCloudAnimations = useMemo(() => {
    let list = cloudAnimationsForView;
    // Filter by tab when in animations gallery (tabs apply to both registry and cloud)
    if (selectedTabId !== 'all') {
      list = list.filter((m) => getAnimationTab(m.localId) === selectedTabId);
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (m) => m.name.toLowerCase().includes(q) || m.localId.toLowerCase().includes(q)
    );
  }, [cloudAnimationsForView, selectedTabId, searchQuery, getAnimationTab]);

  // ── Tab counts ──────────────────────────────────────────────
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: viewMode === 'public'
        ? registryAnimations.length + cloudAnimationsForView.length
        : cloudAnimationsForView.length,
    };
    if (viewMode === 'public') {
      for (const entry of registryAnimations) {
        const tabId = getAnimationTab(getAnimationId(entry));
        if (tabId) counts[tabId] = (counts[tabId] || 0) + 1;
      }
      for (const m of cloudAnimationsForView) {
        const tabId = getAnimationTab(m.localId);
        if (tabId) counts[tabId] = (counts[tabId] || 0) + 1;
      }
    } else {
      // Private: only cloud animations
      for (const m of cloudAnimationsForView) {
        const tabId = getAnimationTab(m.localId);
        if (tabId) counts[tabId] = (counts[tabId] || 0) + 1;
      }
    }
    return counts;
  }, [viewMode, registryAnimations, cloudAnimationsForView, getAnimationTab]);

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

  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!animationToDelete) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/delete-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: animationToDelete.id }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        // Also hide it locally in case HMR hasn't reloaded yet
        deleteAnimation(animationToDelete.id);
        toast.success(`Deleted "${animationToDelete.name}" — source files removed`);
      } else {
        // Fallback: if API fails (e.g. production build), still hide locally
        deleteAnimation(animationToDelete.id);
        toast.error(`Couldn't delete source files: ${data.error || 'unknown error'}. Hidden from gallery instead.`);
      }
    } catch {
      // Network error or no dev server — still hide locally
      deleteAnimation(animationToDelete.id);
      toast.error('Dev server not available — animation hidden but source files not deleted.');
    } finally {
      setDeleting(false);
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

  const handleCreateAnimationSave = useCallback(
    async (input: import('../lib/animation-cloud').CloudAnimationInput) => {
      if (!useCloud) return { localId: '', error: new Error('Sign in to save to gallery') };
      const { localId, error } = await workspace.saveAnimation(input);
      if (!error) refreshAnimations();
      return { localId, error };
    },
    [useCloud, workspace, refreshAnimations]
  );

  const handleAnimationPromote = useCallback(
    async (localId: string) => {
      const { error } = await workspace.promoteAnimation(localId);
      if (error) toast.error(error.message);
      else {
        refreshAnimations();
        toast.success('Animation promoted to public');
      }
    },
    [workspace, refreshAnimations]
  );

  const handleAnimationDemote = useCallback(
    async (localId: string) => {
      const { error } = await workspace.demoteAnimation(localId);
      if (error) toast.error(error.message);
      else {
        refreshAnimations();
        toast.success('Animation is now private');
      }
    },
    [workspace, refreshAnimations]
  );

  const handleAnimationDelete = useCallback(
    async (localId: string) => {
      const { error } = await workspace.deleteAnimation(localId);
      if (error) toast.error(error.message);
      else {
        refreshAnimations();
        toast.success('Animation deleted');
      }
    },
    [workspace, refreshAnimations]
  );

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
    const entry = registryAnimations.find((a) => getAnimationId(a) === animId);
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
  }, [registryAnimations]);

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
        // Find the animation name for the toast (registry or cloud)
        const entry = registryAnimations.find((a) => getAnimationId(a) === animId);
        const animName = entry && 'name' in entry.definition && entry.definition.name
          ? entry.definition.name
          : cloudAnimationsForView.find((m) => m.localId === animId)?.name ?? animId;
        notifyMove(animName, targetTab);
      }
      setDraggingId(null);
      setDragOverTabId(null);
      dragCounterRef.current = {};
    },
    [moveAnimationToTab, registryAnimations, cloudAnimationsForView, notifyMove],
  );

  const handleCloudDragStart = useCallback((e: React.DragEvent, localId: string, name: string) => {
    e.dataTransfer.setData('text/plain', localId);
    e.dataTransfer.effectAllowed = 'move';
    const ghost = document.createElement('div');
    ghost.textContent = name;
    ghost.style.cssText =
      'position:fixed;left:-9999px;top:-9999px;height:24px;line-height:24px;padding:0 10px;' +
      'border-radius:6px;font-size:12px;font-weight:500;white-space:nowrap;' +
      'background:hsl(var(--primary));color:hsl(var(--primary-foreground));' +
      'display:flex;align-items:center;pointer-events:none;';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 12);
    requestAnimationFrame(() => {
      document.body.removeChild(ghost);
      setDraggingId(localId);
    });
  }, []);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 w-full bg-background">
        {/* ── Row 1: Title + user ── */}
        <header>
          <div className="container my-0 mx-auto pl-6 pr-6 pt-12 pb-4 flex items-start justify-between">
            <div className="flex items-center gap-8">
              <div className="overflow-visible">
                <h1 className={`font-medium tracking-tight  transition-all duration-200 ${headerCompact ? 'text-base' : 'text-6xl'}`}>
                  Motion Canvas Lab
                </h1>
                <p className={`text-xl text-muted-foreground mt-0.5 overflow-hidden transition-all duration-200 ease-out ${headerCompact ? 'opacity-0 mt-0' : 'opacity-100'}`}>
                  powered by Clueso
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-4">
              {auth.isConfigured && (
                isAnonymous ? (
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAuthDialogOpen(true)}>
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <User className="h-4 w-4" />
                        <span className="max-w-[120px] truncate">{auth.user?.email}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{workspace.workspace?.name ?? 'Workspace'}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => auth.signOut()}>
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* ── Row 2: Underline tabs + Public/Private toggle ── */}
        <div>
          <div className="container mx-auto px-6 pt-0 pb-0 mt-0 mb-0 flex h-auto items-end justify-between">
            <div className="flex items-stretch gap-4">
              <button
                onClick={() => setGalleryTab('animations')}
                className={`px-0 py-0 text-sm font-medium border-b-2 transition-colors ${
                  galleryTab === 'animations'
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                }`}
              >
                Reusable animations
              </button>
              <button
                onClick={() => setGalleryTab('sequences')}
                className={`px-0 py-3 text-sm font-medium border-b-2 transition-colors ${
                  galleryTab === 'sequences'
                    ? 'border-foreground text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                }`}
              >
                Video Sequences
              </button>
            </div>
            {auth.user && (
              <div className="flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5 mb-2" title={viewMode === 'public' ? 'Viewing public gallery' : 'Viewing my workspace'}>
                <Button
                  variant={viewMode === 'public' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-8 px-2.5 gap-1.5 text-xs"
                  onClick={() => setViewMode('public')}
                >
                  <Globe className="h-3.5 w-3.5" />
                  Public
                </Button>
                <Button
                  variant={viewMode === 'private' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 px-2.5 gap-1.5 text-xs"
                  onClick={() => setViewMode('private')}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Private
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* ── Row 3: Search + category tabs + actions ── */}
        <div>
          <div className="container mx-auto px-6 pt-6 pb-6 flex items-center gap-3 flex-wrap">
            {galleryTab === 'animations' ? (
              <>
                <div className="relative flex-shrink-0 w-full sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search animations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => scrollTabs(animTabsScrollRef, 'left', setAnimTabsScrollState)}
                    disabled={!animTabsScrollState.canScrollLeft}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div
                    ref={animTabsScrollRef}
                    className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide min-w-0"
                  >
                    {allTabs.map((tab) => {
                      const active = tab.id === selectedTabId;
                      const isDropTarget = dragOverTabId === tab.id && draggingId !== null;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setSelectedTabId(tab.id)}
                          onDragEnter={(e) => handleTabDragEnter(e, tab.id)}
                          onDragOver={handleTabDragOver}
                          onDragLeave={(e) => handleTabDragLeave(e, tab.id)}
                          onDrop={(e) => handleTabDrop(e, tab.id)}
                          className={`whitespace-nowrap px-3 py-1 rounded-md text-xs font-medium transition-all flex-shrink-0 ${
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          } ${isDropTarget ? 'ring-2 ring-primary ring-offset-2 scale-105 bg-primary/10' : ''}`}
                        >
                          {tab.name}
                          <span className="ml-1 tabular-nums opacity-70">{tabCounts[tab.id] ?? 0}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => scrollTabs(animTabsScrollRef, 'right', setAnimTabsScrollState)}
                    disabled={!animTabsScrollState.canScrollRight}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Tabs</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { setNewTabName(''); setNewTabOpen(true); }}
                      disabled={isAnonymous}
                      title={isAnonymous ? 'Sign in to create tabs' : undefined}
                    >
                      <Plus className="h-4 w-4" /> Create new tab
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setDeleteTabOpen(true)} disabled={tabs.length === 0 || isAnonymous} title={isAnonymous ? 'Sign in to manage tabs' : undefined}>
                      <Trash2 className="h-4 w-4" /> Delete tab
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSaveAsDefault} disabled={saveStatus === 'saving' || isAnonymous}>
                      <Save className="h-4 w-4" />
                      {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : saveStatus === 'error' ? 'Error saving' : 'Save as default'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 flex-shrink-0"
                  onClick={() => (isAnonymous ? setAuthDialogOpen(true) : setCreateAnimOpen(true))}
                >
                  <Plus className="h-4 w-4" />
                  New Animation
                </Button>
              </>
            ) : (
              <>
                <div className="relative flex-shrink-0 w-full sm:w-56">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search sequences..."
                    value={sequenceSearchQuery}
                    onChange={(e) => setSequenceSearchQuery(e.target.value)}
                    className="pl-8 h-8"
                  />
                </div>
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => scrollTabs(seqTabsScrollRef, 'left', setSeqTabsScrollState)}
                    disabled={!seqTabsScrollState.canScrollLeft}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div
                    ref={seqTabsScrollRef}
                    className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-hide min-w-0"
                  >
                    {sequenceAllTabs.map((tab) => {
                      const active = tab.id === sequenceSelectedTabId;
                      const isDropTarget = sequenceDragOverTabId === tab.id && sequenceDraggingId !== null;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setSequenceSelectedTabId(tab.id)}
                          onDragEnter={(e) => handleSequenceTabDragEnter(e, tab.id)}
                          onDragOver={handleSequenceTabDragOver}
                          onDragLeave={(e) => handleSequenceTabDragLeave(e, tab.id)}
                          onDrop={(e) => handleSequenceTabDrop(e, tab.id)}
                          className={`whitespace-nowrap px-3 py-1 rounded-md text-xs font-medium transition-all flex-shrink-0 ${
                            active
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                          } ${isDropTarget ? 'ring-2 ring-primary ring-offset-2 scale-105 bg-primary/10' : ''}`}
                        >
                          {tab.name}
                          <span className="ml-1 tabular-nums opacity-70">{sequenceTabCounts[tab.id] ?? 0}</span>
                        </button>
                      );
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => scrollTabs(seqTabsScrollRef, 'right', setSeqTabsScrollState)}
                    disabled={!seqTabsScrollState.canScrollRight}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Tabs</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { setSequenceNewTabName(''); setSequenceNewTabOpen(true); }}
                      disabled={isAnonymous}
                      title={isAnonymous ? 'Sign in to create tabs' : undefined}
                    >
                      <Plus className="h-4 w-4" /> Create new tab
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSequenceDeleteTabOpen(true)} disabled={sequenceTabs.length === 0 || isAnonymous} title={isAnonymous ? 'Sign in to manage tabs' : undefined}>
                      <Trash2 className="h-4 w-4" /> Delete tab
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => (isAnonymous ? setAuthDialogOpen(true) : sequenceImportRef.current?.click())}
                    >
                      <Upload className="h-4 w-4" /> Import sequence
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <input
                  ref={sequenceImportRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleSequenceImport}
                />
                {isAnonymous ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-shrink-0"
                    onClick={() => setAuthDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    New Sequence
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" className="gap-2 flex-shrink-0" asChild>
                    <Link to="/compose">
                      <Plus className="h-4 w-4" />
                      New Sequence
                    </Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 pt-2 pb-8">
        {galleryTab === 'animations' ? (
        /* ── Animations grid ──────────────────────────────────────────── */
        (() => {
          const publicLoading = viewMode === 'public' && publicAnimationsLoading && registryAnimations.length === 0;
          const publicEmpty = viewMode === 'public' && registryAnimations.length === 0 && publicAnimations.length === 0 && !publicAnimationsLoading;
          const privateEmpty = viewMode === 'private' && cloudAnimationsForView.length === 0 && (!useCloud || !workspace.animationsLoading);
          const hasNoAnimations = publicEmpty || privateEmpty;

          if (publicLoading) {
            return (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <p className="text-muted-foreground">Loading animations...</p>
              </div>
            );
          }
          const hasNoFiltered = viewMode === 'public'
            ? filteredRegistryAnimations.length === 0 && filteredCloudAnimations.length === 0
            : filteredCloudAnimations.length === 0;

          if (hasNoAnimations) {
            return (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                <p className="text-xl text-muted-foreground mb-4">
                  {viewMode === 'private' ? 'No animations in your workspace.' : 'No animations yet.'}
                </p>
                <p className="text-muted-foreground mb-4">
                  {viewMode === 'private'
                    ? 'Create one with code or AI from the button above.'
                    : 'Request an animation to get started.'}
                </p>
                {!isAnonymous && useCloud && (
                  <Button onClick={() => setCreateAnimOpen(true)} className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    Create animation
                  </Button>
                )}
              </div>
            );
          }
          if (hasNoFiltered) {
            return (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
                {searchQuery.trim() ? (
                  <>
                    <p className="text-lg text-muted-foreground mb-2">No animations match &quot;{searchQuery.trim()}&quot;</p>
                    <p className="text-sm text-muted-foreground">
                      Try a different search term, or search by name, id, or tags.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg text-muted-foreground mb-2">No animations in this tab.</p>
                    <p className="text-sm text-muted-foreground">
                      Drag animations here from the <strong>All</strong> tab, or use the folder icon on each card.
                    </p>
                  </>
                )}
              </div>
            );
          }
          return (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {viewMode === 'public' && filteredRegistryAnimations.map((entry) => {
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
                  draggable={!isAnonymous}
                  onDragStart={(e) => handleDragStart(e, id)}
                  onDragEnd={handleDragEnd}
                  onMouseEnter={() => setHoveredId(id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="group relative rounded-lg overflow-hidden bg-card shadow-sm">
                    <div
                      className="w-full"
                      style={{
                        backgroundColor: entry.definition.background || 'hsl(var(--muted))',
                        aspectRatio: `${entry.definition.width ?? 800} / ${entry.definition.height ?? 600}`,
                      }}
                    >
                      <AnimationThumbnail animation={entry.definition} isPlaying={hoveredId === id} />
                    </div>

                    {/* Action buttons - top right (hidden for anonymous) */}
                    {!isAnonymous && (
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
                    )}

                    {/* Title - bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <h3 className="text-white font-medium text-sm truncate">{name}</h3>
                    </div>
                  </div>
                </Link>
              );
            })}
            {filteredCloudAnimations.map((meta) => (
              <CloudAnimationCard
                key={meta.localId}
                meta={meta}
                isHovered={hoveredId === meta.localId}
                onHover={setHoveredId}
                onPromote={useCloud && !meta.isPublic ? () => handleAnimationPromote(meta.localId) : undefined}
                onDemote={useCloud && meta.isPublic ? () => handleAnimationDemote(meta.localId) : undefined}
                onDelete={useCloud ? () => handleAnimationDelete(meta.localId) : undefined}
                creatorEmail={viewMode === 'public' ? meta.creatorEmail : undefined}
                workspaceId={viewMode === 'private' ? workspace.workspace?.id : undefined}
                assignedTab={getAnimationTab(meta.localId) ?? ''}
                allTabs={allTabs}
                onMoveToTab={!isAnonymous ? (tabId) => { moveAnimationToTab(meta.localId, tabId); notifyMove(meta.name, tabId); } : undefined}
                draggable={!isAnonymous}
                onDragStart={!isAnonymous ? (e) => handleCloudDragStart(e, meta.localId, meta.name) : undefined}
                onDragEnd={handleDragEnd}
                isDragging={draggingId === meta.localId}
              />
            ))}
          </div>
          );
        })()
        ) : (
        /* ── Sequence gallery ──────────────────────────────────────────── */
        <>
          {(useCloud && workspace.sequencesLoading) || (isAnonymous && publicSequencesLoading) ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <p className="text-muted-foreground">Loading sequences...</p>
            </div>
          ) : sequences.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
              <p className="text-xl text-muted-foreground mb-4">
                {isAnonymous ? 'No public sequences yet.' : 'No saved sequences yet.'}
              </p>
              {isAnonymous ? (
                <p className="text-muted-foreground">Sign in to create and share sequences.</p>
              ) : (
                <>
                  <p className="text-muted-foreground mb-6">
                    Create sequences in the Composer — they are auto-saved as you work.
                  </p>
                  <Button asChild>
                    <Link to="/compose">
                      <Clapperboard className="h-4 w-4" />
                      Open Composer
                    </Link>
                  </Button>
                </>
              )}
            </div>
          ) : filteredSequences.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
              {sequenceSearchQuery.trim() ? (
                <>
                  <p className="text-lg text-muted-foreground mb-2">No sequences match &quot;{sequenceSearchQuery.trim()}&quot;</p>
                  <p className="text-sm text-muted-foreground">Try a different search term.</p>
                </>
              ) : (
                <>
                  <p className="text-lg text-muted-foreground mb-2">No sequences in this tab.</p>
                  <p className="text-sm text-muted-foreground">
                    Drag sequences here from the <strong>All</strong> tab, or use the folder icon on each card.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
              {filteredSequences.map((meta) => (
                <div
                  key={meta.id}
                  onMouseEnter={() => setSequenceHoveredId(meta.id)}
                  onMouseLeave={() => setSequenceHoveredId(null)}
                >
                  <SequenceCard
                    meta={meta}
                    isHovered={sequenceHoveredId === meta.id}
                    loadSequence={loadSequenceById}
                    assignedTab={getSequenceTab(meta.id) ?? ''}
                    allTabs={sequenceAllTabs}
                    onOpen={() => handleSequenceOpen(meta)}
                    onExport={(e) => handleSequenceExport(e, meta)}
                    onDelete={(e) => handleSequenceDeleteClick(e, meta)}
                    onPromote={(e) => handleSequencePromote(e, meta)}
                    onDemote={(e) => handleSequenceDemote(e, meta)}
                    onMoveToTab={(tabId) => {
                      moveSequenceToTab(meta.id, tabId);
                      notifySequenceMove(meta.name, tabId);
                    }}
                    isDragging={sequenceDraggingId === meta.id}
                    draggable={!isAnonymous}
                    onDragStart={(e) => handleSequenceDragStart(e, meta.id)}
                    onDragEnd={handleSequenceDragEnd}
                    viewOnly={isAnonymous}
                    canPromote={useCloud}
                    creatorEmail={viewMode === 'public' ? meta.creatorEmail : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </>
        )}
      </main>

      {/* ── Delete sequence dialog ─────────────────────────── */}
      <AlertDialog open={sequenceDeleteDialogOpen} onOpenChange={setSequenceDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sequence</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{sequenceToDelete?.name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sequenceDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSequenceDelete} disabled={sequenceDeleting}>
              {sequenceDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete animation dialog ─────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Animation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{animationToDelete?.name}"? This will permanently remove its source code from disk. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete permanently'}
            </AlertDialogAction>
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

      {/* ── Sequence: Create tab dialog ───────────────────────── */}
      <Dialog open={sequenceNewTabOpen} onOpenChange={setSequenceNewTabOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create tab</DialogTitle>
            <DialogDescription>
              Add a new tab to organize sequences. You can drag sequences into it from the gallery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="sequence-new-tab-name">Tab name</Label>
            <Input
              id="sequence-new-tab-name"
              value={sequenceNewTabName}
              onChange={(e) => setSequenceNewTabName(e.target.value)}
              placeholder="e.g. Projects"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSequenceCreateTab(); } }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSequenceNewTabOpen(false)}>Cancel</Button>
            <Button onClick={handleSequenceCreateTab} disabled={sequenceNewTabName.trim().length === 0}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Sequence: Delete tab dialog ───────────────────────── */}
      <Dialog open={sequenceDeleteTabOpen} onOpenChange={setSequenceDeleteTabOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tab</DialogTitle>
            <DialogDescription>
              Choose a tab to delete. Sequences in the tab will be moved back to All.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sequenceTabs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No tabs to delete.</p>
            ) : (
              sequenceTabs.map((tab) => (
                <div key={tab.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm font-medium">{tab.name}</span>
                  <Button variant="destructive" size="sm" onClick={() => handleSequenceDeleteTab(tab.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSequenceDeleteTabOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
      <CreateAnimationDialog
        open={createAnimOpen}
        onOpenChange={setCreateAnimOpen}
        onSave={handleCreateAnimationSave}
      />
    </div>
  );
}
