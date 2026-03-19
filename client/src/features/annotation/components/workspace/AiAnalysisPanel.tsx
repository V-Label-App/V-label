import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Lightbulb, Loader2 } from "lucide-react";
import { useAnnotationStore } from "../../stores";
import { cn } from "../../../../components/ui/utils";

interface AiAnalysisPanelProps {
  isOpen: boolean;
  onClose: () => void;
  tips?: string[];
  labelColors?: Record<string, string>;
}

export function AiAnalysisPanel({
  isOpen,
  onClose,
  tips = [],
  labelColors = {},
}: AiAnalysisPanelProps) {
  const { annotations } = useAnnotationStore();

  const aiAnnotations = annotations.filter((a) => a.aiSuggested);
  const avgConfidence =
    aiAnnotations.length > 0
      ? aiAnnotations.reduce((s, a) => s + (a.confidence ?? 0), 0) /
        aiAnnotations.length
      : 0;

  const byLabel = aiAnnotations.reduce(
    (acc, a) => {
      acc[a.label] = (acc[a.label] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const confidenceColor =
    avgConfidence >= 0.85
      ? "text-emerald-400"
      : avgConfidence >= 0.7
        ? "text-yellow-400"
        : "text-red-400";

  // Auto-close after 20s
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(onClose, 20000);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  // Close if no AI annotations left
  useEffect(() => {
    if (isOpen && aiAnnotations.length === 0) onClose();
  }, [annotations, isOpen, onClose, aiAnnotations.length]);

  const isLoadingTips = tips.length === 0;

  return (
    <AnimatePresence>
      {isOpen && aiAnnotations.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: 12, opacity: 0, x: "-50%" }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          className="fixed bottom-28 left-1/2 z-[110] w-[360px]"
        >
          <div className="rounded-2xl bg-slate-900/90 backdrop-blur-2xl border border-purple-500/30 shadow-[0_0_24px_rgba(168,85,247,0.15)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-white">
                  AI gợi ý{" "}
                  <span className="text-purple-400">{aiAnnotations.length}</span>{" "}
                  vùng
                </span>
                <span
                  className={cn(
                    "text-xs font-bold px-1.5 py-0.5 rounded-full bg-slate-800",
                    confidenceColor,
                  )}
                >
                  {Math.round(avgConfidence * 100)}%
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Label chips */}
            <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
              {Object.entries(byLabel).map(([label, count]) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-white/10"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: labelColors[label] ?? "#a855f7" }}
                  />
                  <span className="text-xs text-slate-200">{label}</span>
                  <span className="text-xs font-bold text-white">×{count}</span>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="mx-4 mb-3 rounded-xl bg-slate-800/60 border border-white/5">
              {/* Tips header */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5">
                <Lightbulb className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="text-xs font-medium text-slate-300">
                  Lưu ý từ AI
                </span>
              </div>

              {/* Loading state */}
              {isLoadingTips ? (
                <div className="flex items-center gap-2 px-3 py-3">
                  <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin shrink-0" />
                  <span className="text-xs text-slate-500">
                    Đang phân tích...
                  </span>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {tips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 px-3 py-2.5"
                    >
                      <span className="text-[10px] font-bold text-purple-400 mt-0.5 shrink-0">
                        {i + 1}
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {tip}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
