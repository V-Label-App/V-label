import { format } from "date-fns";
import { Clock, History, Eye, RotateCcw } from "lucide-react";
import { ScrollArea } from "../../../../components/ui/scroll-area";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import type { SubmissionHistoryItem } from "../../../../services/annotator.api";
import type { Annotation } from "../../stores";

interface HistoryPanelProps {
  history?: SubmissionHistoryItem[];
  onPreviewAnnotations?: (annotations: Annotation[], submissionNumber: number) => void;
  onRestoreCurrent?: () => void;
  previewingSubmission?: number | null;
}

export function HistoryPanel({
  history = [],
  onPreviewAnnotations,
  onRestoreCurrent,
  previewingSubmission = null,
}: HistoryPanelProps) {
  // Already sorted by BE (submissionNumber desc), newest first
  const sortedHistory = [...history].sort(
    (a, b) => b.submissionNumber - a.submissionNumber
  );

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Banner when previewing history */}
      {previewingSubmission !== null && (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-950/50 border border-amber-600/40 rounded-lg text-xs text-amber-300">
          <span className="flex items-center gap-1.5">
            <Eye className="w-3 h-3 shrink-0" />
            Viewing submission #{previewingSubmission}
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-amber-300 hover:text-white hover:bg-amber-800/50 text-xs"
            onClick={onRestoreCurrent}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Back
          </Button>
        </div>
      )}

      {sortedHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-slate-500 py-10">
          <History className="w-10 h-10 mb-2 opacity-20" />
          <p className="text-sm">No historical records</p>
          <p className="text-xs">This task has no previous rejections.</p>
        </div>
      ) : (
        <ScrollArea className="flex-1 -mr-4 pr-4 h-full">
          <div className="space-y-4 pt-1 pb-4">
            {sortedHistory.map((item) => {
              const isPreviewing = previewingSubmission === item.submissionNumber;
              return (
                <div
                  key={item.id}
                  className={`relative pl-5 pb-4 last:pb-0`}
                >
                  {/* Timeline dot */}
                  <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-slate-800 flex items-center justify-center z-10 ${
                    item.status === "REJECTED" ? "bg-red-500" : "bg-amber-500"
                  }`}>
                    <div className="w-1 h-1 bg-white rounded-full" />
                  </div>

                  <div className={`bg-slate-900/50 border rounded-lg p-3 shadow-sm transition-all ${
                    isPreviewing ? "border-amber-500/60 bg-amber-950/20" : "border-slate-700"
                  }`}>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">
                          Submission #{item.submissionNumber}
                        </span>
                        {item.annotator && (
                          <span className="text-[10px] text-slate-400">
                            By: {item.annotator.fullName}
                          </span>
                        )}
                      </div>
                      <Badge variant="outline" className={`text-[9px] h-4 py-0 ${
                        item.status === "REJECTED"
                          ? "text-red-400 border-red-900/50 bg-red-950/20"
                          : "text-amber-400 border-amber-900/50 bg-amber-950/20"
                      }`}>
                        {item.status}
                      </Badge>
                    </div>

                    {/* Annotator Note */}
                    {item.annotatorNote && (
                      <div className="mb-2 p-2 bg-blue-400/5 border border-blue-900/20 rounded text-xs text-blue-200 italic relative">
                        <span className="absolute -top-1.5 left-2 bg-slate-800 px-1 text-[8px] font-medium text-blue-400 uppercase tracking-wider">
                          Annotator Note
                        </span>
                        "{item.annotatorNote}"
                      </div>
                    )}

                    {/* Review Comment */}
                    {item.reviewComment && (
                      <div className="mb-2 p-2 bg-red-400/5 border border-red-900/20 rounded text-xs text-red-200 italic relative">
                        <span className="absolute -top-1.5 left-2 bg-slate-800 px-1 text-[8px] font-medium text-red-400 uppercase tracking-wider">
                          Reviewer Comment
                        </span>
                        "{item.reviewComment}"
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="text-[9px] text-slate-500 flex flex-col gap-0.5 pt-1.5 border-t border-slate-800 mt-2">
                      {item.submittedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Submitted: {format(new Date(item.submittedAt), "dd/MM/yyyy HH:mm")}
                        </span>
                      )}
                      {item.reviewedAt && (
                        <span className="flex items-center gap-1 text-red-400/70">
                          <Clock className="w-2.5 h-2.5" />
                          Rejected: {format(new Date(item.reviewedAt), "dd/MM/yyyy HH:mm")}
                        </span>
                      )}
                    </div>

                    {/* Preview button */}
                    {item.annotations && item.annotations.length > 0 && onPreviewAnnotations && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={`w-full mt-2 h-7 text-[10px] transition-all ${
                          isPreviewing
                            ? "bg-amber-800/40 border-amber-600 text-amber-200"
                            : "bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                        onClick={() => {
                          if (isPreviewing) {
                            onRestoreCurrent?.();
                          } else {
                            onPreviewAnnotations(
                              item.annotations as Annotation[],
                              item.submissionNumber
                            );
                          }
                        }}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        {isPreviewing ? "Viewing" : `View annotations #${item.submissionNumber}`}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
