import { useAnnotationStore } from "../../stores";
import { Textarea } from "../../../../components/ui/textarea";
import { Label } from "../../../../components/ui/label";

interface DiscussionPanelProps {
  isReadOnly?: boolean;
}

export function DiscussionPanel({ isReadOnly = false }: DiscussionPanelProps) {
  const { annotatorNote, setAnnotatorNote, reviewComment } =
    useAnnotationStore();

  return (
    <div className="space-y-4 overflow-y-auto max-h-full">
      {/* Annotator Notes */}
      <div>
        <Label className="text-slate-300 mb-2 block">Annotator Notes</Label>
        <Textarea
          value={annotatorNote}
          onChange={(e) => setAnnotatorNote(e.target.value)}
          placeholder="Add notes about this annotation task..."
          className="bg-slate-900 border-slate-700 text-white min-h-[120px] resize-none"
          disabled={isReadOnly}
        />
      </div>

      {/* Review Comments */}
      <div>
        <Label className="text-slate-300 mb-2 block">Review Comments</Label>
        <Textarea
          value={reviewComment}
          readOnly
          placeholder="Reviewer feedback will appear here..."
          className="bg-red-950/50 border-red-900 text-red-100 min-h-[120px] resize-none"
          disabled
        />
      </div>
    </div>
  );
}
