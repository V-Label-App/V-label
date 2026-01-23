import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { X, Trash2, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface ManageImagesDialogProps {
  images: File[];
  onRemove: (indexes: number[]) => void;
  onClose: () => void;
}

type SortBy = 'name' | 'size' | 'type';

export function ManageImagesDialog({ images, onRemove, onClose }: ManageImagesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const itemsPerPage = 50;

  // Filtered and sorted images
  const processedImages = useMemo(() => {
    let filtered = images.map((file, index) => ({ file, originalIndex: index }));

    // Search
    if (searchQuery) {
      filtered = filtered.filter(({ file }) =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.file.name.localeCompare(b.file.name);
        case 'size':
          return b.file.size - a.file.size;
        case 'type':
          const extA = a.file.name.split('.').pop() || '';
          const extB = b.file.name.split('.').pop() || '';
          return extA.localeCompare(extB);
        default:
          return 0;
      }
    });

    return filtered;
  }, [images, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(processedImages.length / itemsPerPage);
  const paginatedImages = processedImages.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search/filter changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  // Keyboard navigation for preview
  useEffect(() => {
    if (previewIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigatePreview(-1);
      } else if (e.key === 'ArrowRight') {
        navigatePreview(1);
      } else if (e.key === 'Escape') {
        setPreviewIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewIndex, images.length]);

  // Navigate preview
  const navigatePreview = (direction: number) => {
    if (previewIndex === null) return;

    const newIndex = previewIndex + direction;
    if (newIndex >= 0 && newIndex < images.length) {
      setPreviewIndex(newIndex);
    }
  };

  // Toggle selection
  const toggleSelect = (index: number) => {
    const newSet = new Set(selectedIndexes);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIndexes(newSet);
  };

  // Select all on current page
  const selectAllPage = () => {
    const newSet = new Set(selectedIndexes);
    paginatedImages.forEach(({ originalIndex }) => {
      newSet.add(originalIndex);
    });
    setSelectedIndexes(newSet);
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedIndexes(new Set());
  };

  // Remove selected
  const removeSelected = () => {
    const toRemove = Array.from(selectedIndexes).sort((a, b) => b - a);
    onRemove(toRemove);
    setSelectedIndexes(new Set());
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Pagination helpers
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  const previewFile = previewIndex !== null ? images[previewIndex] : null;

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Manage Uploaded Images ({images.length})
            </DialogTitle>
            <DialogDescription>
              Search, filter, and remove images. Click on any image to preview.
            </DialogDescription>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 pb-4 border-b">
            <div className="flex-1 min-w-[300px]">
              <Input
                placeholder="Search filenames..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort: Name</SelectItem>
                <SelectItem value="size">Sort: Size</SelectItem>
                <SelectItem value="type">Sort: Type</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={selectAllPage}>
              Select Page
            </Button>

            {selectedIndexes.size > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={removeSelected}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove ({selectedIndexes.size})
                </Button>
              </>
            )}
          </div>

          {/* Table with proper scrolling */}
          <div className="flex-1 overflow-auto border rounded-lg">
            {processedImages.length > 0 ? (
              <Table>
                <TableHeader className="sticky top-0 bg-gray-50 z-10">
                  <TableRow>
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead className="w-[60px] text-center">#</TableHead>
                    <TableHead className="w-[100px]">Preview</TableHead>
                    <TableHead>Filename</TableHead>
                    <TableHead className="w-[120px] text-right">Size</TableHead>
                    <TableHead className="w-[100px] text-center">Type</TableHead>
                    <TableHead className="w-[80px] text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedImages.map(({ file, originalIndex }) => {
                    const isSelected = selectedIndexes.has(originalIndex);
                    const ext = file.name.split('.').pop()?.toUpperCase() || '?';

                    return (
                      <TableRow
                        key={originalIndex}
                        className={isSelected ? 'bg-blue-50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(originalIndex)}
                          />
                        </TableCell>

                        <TableCell className="text-center text-muted-foreground">
                          {originalIndex + 1}
                        </TableCell>

                        <TableCell>
                          <div
                            className="w-16 h-16 bg-gray-100 rounded border overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all group relative"
                            onClick={() => setPreviewIndex(originalIndex)}
                          >
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-6 h-6 text-white" />
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <p className="font-medium truncate max-w-md" title={file.name}>
                            {file.name}
                          </p>
                        </TableCell>

                        <TableCell className="text-right text-muted-foreground">
                          {formatSize(file.size)}
                        </TableCell>

                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {ext}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove([originalIndex])}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <p>No images found matching "{searchQuery}"</p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} • Showing {paginatedImages.length} of {processedImages.length}
              </p>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => goToPage(currentPage - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {getPageNumbers().map((page, idx) => (
                  typeof page === 'number' ? (
                    <Button
                      key={idx}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => goToPage(page)}
                      className="w-9"
                    >
                      {page}
                    </Button>
                  ) : (
                    <span key={idx} className="px-2 text-muted-foreground text-sm">
                      {page}
                    </span>
                  )
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => goToPage(currentPage + 1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              {selectedIndexes.size > 0 && `${selectedIndexes.size} selected • `}
              Total: {images.length} image{images.length !== 1 ? 's' : ''}
            </p>
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewFile && previewIndex !== null && (
        <Dialog open={true} onOpenChange={() => setPreviewIndex(null)}>
          <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col p-0">
            <DialogHeader className="sr-only">
              <DialogTitle>{previewFile.name}</DialogTitle>
              <DialogDescription>
                Image preview - Image {previewIndex + 1} of {images.length}
              </DialogDescription>
            </DialogHeader>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{previewFile.name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span>Image {previewIndex + 1} of {images.length}</span>
                  <span>•</span>
                  <span>{formatSize(previewFile.size)}</span>
                  <span>•</span>
                  <Badge variant="outline" className="text-xs">
                    {previewFile.name.split('.').pop()?.toUpperCase() || '?'}
                  </Badge>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewIndex(null)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Image Container */}
            <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-8">
              <img
                src={URL.createObjectURL(previewFile)}
                alt={previewFile.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Navigation Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t bg-white">
              <Button
                variant="outline"
                onClick={() => navigatePreview(-1)}
                disabled={previewIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toggleSelect(previewIndex);
                  }}
                >
                  {selectedIndexes.has(previewIndex) ? 'Unselect' : 'Select'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    onRemove([previewIndex]);
                    setPreviewIndex(null);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={() => navigatePreview(1)}
                disabled={previewIndex === images.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}