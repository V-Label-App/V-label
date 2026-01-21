import { Button } from '../../../../components/ui/button';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useImageStore } from '../../stores';
import { cn } from '../../../../components/ui/utils';

export function ImageNavigator() {
    const { images, currentIndex, goToNext, goToPrevious, jumpToImage, hasNext, hasPrevious } = useImageStore();

    if (images.length === 0) return null;

    // const currentImage = images[currentIndex];

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-800/95 backdrop-blur rounded-lg px-4 py-3 shadow-2xl border border-slate-700 z-20">
            {/* Previous Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                disabled={!hasPrevious()}
                className="text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 p-0"
                title="Previous Image (Alt+←)"
            >
                <ChevronLeft className="w-4 h-4" />
            </Button>

            {/* Thumbnail Carousel */}
            <div className="flex items-center gap-2 max-w-md overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                {images.map((image, index) => (
                    <button
                        key={image.id}
                        onClick={() => jumpToImage(index)}
                        className={cn(
                            "flex-shrink-0 w-16 h-16 rounded-lg border-2 transition-all relative overflow-hidden group",
                            index === currentIndex
                                ? "border-blue-500 ring-2 ring-blue-500/50"
                                : "border-slate-600 hover:border-blue-400 opacity-60 hover:opacity-100"
                        )}
                        title={image.filename}
                    >
                        {/* Thumbnail */}
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-2xl">
                            {image.thumbnail}
                        </div>

                        {/* Status Indicator */}
                        <div className={cn(
                            "absolute top-1 right-1 w-2 h-2 rounded-full",
                            image.status === 'approved' && "bg-green-500",
                            image.status === 'rejected' && "bg-red-500",
                            image.status === 'submitted' && "bg-blue-500",
                            image.status === 'in_progress' && "bg-yellow-500",
                            image.status === 'assigned' && "bg-gray-400"
                        )} />

                        {/* Current Indicator */}
                        {index === currentIndex && (
                            <div className="absolute inset-0 flex items-center justify-center bg-blue-600/20">
                                <Check className="w-6 h-6 text-blue-500" />
                            </div>
                        )}

                        {/* Annotation Count Badge */}
                        {image.annotationCount > 0 && (
                            <div className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[10px] px-1.5 py-0.5 rounded">
                                {image.annotationCount}
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Image Counter */}
            <div className="flex items-center gap-2 text-sm px-2">
                <span className="text-slate-400">{currentIndex + 1}</span>
                <span className="text-slate-600">/</span>
                <span className="text-white">{images.length}</span>
            </div>

            {/* Next Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                disabled={!hasNext()}
                className="text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed h-8 w-8 p-0"
                title="Next Image (Alt+→)"
            >
                <ChevronRight className="w-4 h-4" />
            </Button>
        </div>
    );
}
