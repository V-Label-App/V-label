import { useMemo } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, X, Search, FileText } from 'lucide-react';

interface CompactImageSummaryProps {
  images: File[];
  onManage: () => void;
  onClear: () => void;
}

export function CompactImageSummary({ images, onManage, onClear }: CompactImageSummaryProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalSize = images.reduce((sum, file) => sum + file.size, 0);
    
    const typeBreakdown = images.reduce((acc, file) => {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
      if (!acc[ext]) {
        acc[ext] = { count: 0, size: 0 };
      }
      acc[ext].count++;
      acc[ext].size += file.size;
      return acc;
    }, {} as Record<string, { count: number; size: number }>);
    
    return { totalSize, typeBreakdown };
  }, [images]);
  
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-semibold text-lg">
              {images.length} image{images.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-sm text-muted-foreground">
              Total: {formatSize(stats.totalSize)}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={onManage}
          >
            <Search className="w-4 h-4 mr-2" />
            Manage Images
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onClear}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        </div>
      </div>
      
      {/* File Types Breakdown */}
      <div className="border-t pt-3">
        <p className="text-xs text-muted-foreground mb-2">File Types:</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(stats.typeBreakdown).map(([type, data]) => (
            <div key={type} className="flex items-center gap-2 text-sm">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{type}:</span>
              <span className="text-muted-foreground">
                {data.count} image{data.count !== 1 ? 's' : ''} ({formatSize(data.size)})
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
