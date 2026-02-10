import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadAnimationCloud } from '../lib/animation-cloud';
import { AnimationThumbnail } from './AnimationThumbnail';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { MoreVertical, Trash2, Globe, Lock, FolderInput } from 'lucide-react';
import type { CloudAnimationMeta } from '../lib/animation-cloud';

interface CloudAnimationCardProps {
  meta: CloudAnimationMeta;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onPromote?: () => void;
  onDemote?: () => void;
  onDelete?: () => void;
  creatorEmail?: string | null;
  /** Pass when viewing private workspace animations so thumbnails load correctly */
  workspaceId?: string | null;
  /** Tab organization - when provided, shows Move to tab and enables drag-and-drop */
  assignedTab?: string;
  allTabs?: { id: string; name: string }[];
  onMoveToTab?: (tabId: string | null) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export function CloudAnimationCard({
  meta,
  isHovered,
  onHover,
  onPromote,
  onDemote,
  onDelete,
  creatorEmail,
  workspaceId,
  assignedTab = '',
  allTabs = [],
  onMoveToTab,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: CloudAnimationCardProps) {
  const [definition, setDefinition] = useState<{ definition: import('../runtime/types').AnyAnimationDefinition } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAnimationCloud(meta.localId, workspaceId ?? undefined).then(({ data }) => {
      if (!cancelled && data) setDefinition({ definition: data.definition });
    });
    return () => { cancelled = true; };
  }, [meta.localId, workspaceId]);

  const w = definition?.definition?.width ?? 800;
  const h = definition?.definition?.height ?? 600;
  const showActions = (onPromote || onDemote || onDelete || (onMoveToTab && allTabs.length > 0));

  return (
    <Link
      to={`/a/${meta.localId}`}
      className={`block mb-4 break-inside-avoid transition-opacity hover:opacity-95 ${isDragging ? 'opacity-40' : ''}`}
      onMouseEnter={() => onHover(meta.localId)}
      onMouseLeave={() => onHover(null)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="group relative rounded-lg overflow-hidden bg-card shadow-sm">
        <div
          className="w-full"
          style={{
            backgroundColor: definition?.definition?.background || 'hsl(var(--muted))',
            aspectRatio: `${w} / ${h}`,
          }}
        >
          {definition ? (
            <AnimationThumbnail animation={definition.definition} isPlaying={isHovered} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              Loading...
            </div>
          )}
        </div>

        {showActions && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {onMoveToTab && allTabs.length > 0 && (
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
            )}
            {(onPromote || onDemote || onDelete) && (
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
                <DropdownMenuContent align="end">
                  {onPromote && !meta.isPublic && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPromote(); }}>
                      <Globe className="h-4 w-4 mr-2" />
                      Make public
                    </DropdownMenuItem>
                  )}
                  {onDemote && meta.isPublic && (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDemote(); }}>
                      <Lock className="h-4 w-4 mr-2" />
                      Make private
                    </DropdownMenuItem>
                  )}
                  {(onPromote || onDemote) && onDelete && <DropdownMenuSeparator />}
                  {onDelete && (
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <h3 className="text-white font-medium text-sm truncate">{meta.name}</h3>
          <p className="text-white/80 text-xs flex items-center gap-2 flex-wrap">
            {meta.isPublic ? (
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</span>
            ) : (
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
            )}
            {creatorEmail && <span className="block w-full mt-0.5 truncate">{creatorEmail}</span>}
          </p>
        </div>
      </div>
    </Link>
  );
}
