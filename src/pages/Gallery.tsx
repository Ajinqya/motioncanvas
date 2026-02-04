import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAnimationRegistry } from '../animations/registry';
import { useDeletedAnimations } from '../hooks/useDeletedAnimations';
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
import { Trash2, Copy, Check } from 'lucide-react';

export function Gallery() {
  const animations = useAnimationRegistry();
  const { deleteAnimation, isDeleted } = useDeletedAnimations();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [animationToDelete, setAnimationToDelete] = useState<{ id: string; name: string } | null>(null);

  // Filter out deleted animations
  const visibleAnimations = animations.filter((entry) => {
    const id = 'id' in entry.definition 
      ? entry.definition.id 
      : ('name' in entry.definition && entry.definition.name)
        ? entry.definition.name.toLowerCase().replace(/\s+/g, '-')
        : 'animation';
    return !isDeleted(id);
  });

  const handleCopyCode = async (e: React.MouseEvent, entry: typeof animations[0]) => {
    e.preventDefault();
    e.stopPropagation();
    
    const id = 'id' in entry.definition 
      ? entry.definition.id 
      : ('name' in entry.definition && entry.definition.name)
        ? entry.definition.name.toLowerCase().replace(/\s+/g, '-')
        : 'animation';
    
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Canvas Animation Lab</h1>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {visibleAnimations.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <p className="text-xl text-muted-foreground mb-4">No animations yet.</p>
            <p className="text-muted-foreground">
              Request an animation to get started.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {visibleAnimations.map((entry) => {
              const id = 'id' in entry.definition 
                ? entry.definition.id 
                : ('name' in entry.definition && entry.definition.name)
                  ? entry.definition.name.toLowerCase().replace(/\s+/g, '-')
                  : 'animation';
              const name = 'name' in entry.definition && entry.definition.name 
                ? entry.definition.name 
                : 'Unnamed Animation';
              const isCopied = copiedId === id;
              
              return (
                <Link 
                  key={id} 
                  to={`/a/${id}`}
                  className="block mb-4 break-inside-avoid"
                >
                  <div className="group relative rounded-lg overflow-hidden border bg-card">
                    <div
                      className="w-full"
                      style={{
                        backgroundColor: entry.definition.background || 'hsl(var(--muted))',
                        aspectRatio: `${entry.definition.width ?? 800} / ${entry.definition.height ?? 600}`,
                      }}
                    >
                      <AnimationThumbnail animation={entry.definition} />
                    </div>
                    
                    {/* Action buttons - top right */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
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
                      <h3 className="text-white font-medium text-sm truncate">
                        {name}
                      </h3>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

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
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
