import { useEffect, useRef } from "react";
import { Button } from "../../../../components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useImageStore } from "../../stores";
import { cn } from "../../../../components/ui/utils";

export function ImageNavigator() {
  const {
    images,
    currentIndex,
    goToNext,
    goToPrevious,
    jumpToImage,
    hasNext,
    hasPrevious,
  } = useImageStore();

  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active thumbnail
  useEffect(() => {
    if (activeThumbRef.current && containerRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [currentIndex]);

  if (images.length <= 1) {
    return null;
  }

  return (
    <div className="absolute top-0 left-0 bottom-0 w-24 bg-slate-900/40 backdrop-blur-xl border-r border-white/5 flex flex-col items-center py-6 gap-6 shadow-2xl z-20 group/nav transition-colors hover:bg-slate-900/60">
      {/* Navigator Header Label */}
      <div className="flex flex-col items-center">
         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Tasks</span>
         <div className="h-0.5 w-8 bg-blue-500/50 rounded-full"></div>
      </div>

      {/* Previous Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToPrevious}
        disabled={!hasPrevious()}
        className="text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 h-10 w-10 shrink-0 transition-all active:scale-90"
        title="Previous Image (Alt+←)"
      >
        <div className="flex flex-col items-center">
          <ChevronLeft className="w-5 h-5 rotate-90" />
        </div>
      </Button>

      {/* Thumbnail Carousel - Vertical */}
      <div
        ref={containerRef}
        className="flex-1 w-full flex flex-col items-center gap-4 overflow-y-auto overflow-x-hidden scrollbar-none py-2 px-1"
      >
        {images.map((image, index) => (
          <button
            key={image.id}
            ref={index === currentIndex ? activeThumbRef : null}
            onClick={() => jumpToImage(index)}
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded-2xl border-2 transition-all relative overflow-hidden group/item",
              index === currentIndex
                ? "border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110"
                : "border-white/5 hover:border-white/20 opacity-40 hover:opacity-100 hover:scale-105",
            )}
            title={image.filename}
          >
            {/* Thumbnail */}
            {image.url ? (
              <img
                src={image.url}
                alt={image.filename}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                {image.thumbnail || "IMG"}
              </div>
            )}

            {/* Status Indicator Badge */}
            <div
              className={cn(
                "absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-slate-900 shadow-sm",
                image.status === "approved" && "bg-green-500 shadow-green-500/50",
                image.status === "rejected" && "bg-red-500 shadow-red-500/50",
                image.status === "submitted" && "bg-blue-500 shadow-blue-500/50",
                image.status === "in_progress" && "bg-yellow-500 shadow-yellow-500/50",
                image.status === "assigned" && "bg-slate-400",
                image.status === "skipped" && "bg-indigo-500 shadow-indigo-500/50",
              )}
            />

            {/* Current Indicator Overlay */}
            {index === currentIndex && (
              <div className="absolute inset-0 flex items-center justify-center bg-blue-600/10 pointer-events-none">
                <div className="w-full h-full border-2 border-blue-500/50 rounded-2xl animate-pulse"></div>
              </div>
            )}
            
            {/* Task Index Number */}
            <div className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-md text-white text-[9px] font-black px-1.5 rounded-md border border-white/10 group-hover/item:bg-blue-600 transition-colors">
              {index + 1}
            </div>
          </button>
        ))}
      </div>

      {/* Next Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={goToNext}
        disabled={!hasNext()}
        className="text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-20 h-10 w-10 shrink-0 transition-all active:scale-90"
        title="Next Image (Alt+→)"
      >
        <ChevronRight className="w-5 h-5 rotate-90" />
      </Button>

      {/* Counter Label */}
      <div className="flex flex-col items-center gap-0.5 pb-2">
        <span className="text-white font-black text-sm tabular-nums">{currentIndex + 1}</span>
        <div className="w-4 h-px bg-slate-700"></div>
        <span className="text-slate-500 font-bold text-[10px] tabular-nums">{images.length}</span>
      </div>
    </div>
  );
}
