import { useAnnotationStore } from "../../stores";
import { Textarea } from "../../../../components/ui/textarea";
import { Label } from "../../../../components/ui/label";
import { AlertCircle } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../../../components/ui/alert";

interface DiscussionPanelProps {
  isReadOnly?: boolean;
}

export function DiscussionPanel({ isReadOnly = false }: DiscussionPanelProps) {
  const { annotatorNote, setAnnotatorNote, reviewComment } =
    useAnnotationStore();

  return (
    <div className="space-y-4 overflow-y-auto max-h-full">
      {/* Review Comments */}
      {reviewComment && (
        <Alert
          variant="destructive"
          className="bg-red-950/20 border-red-900/50"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertTitle className="text-red-400 font-semibold mb-1">
            Review Feedback
          </AlertTitle>
          <AlertDescription className="text-red-100/80 italic text-sm">
            "{reviewComment}"
          </AlertDescription>
        </Alert>
      )}

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

      {!reviewComment && (
        <div>
          <Label className="text-slate-300 mb-2 block">Review Comments</Label>
          <Textarea
            value=""
            readOnly
            placeholder="No reviewer feedback yet..."
            className="bg-slate-900/50 border-slate-800 text-slate-500 min-h-[100px] resize-none"
            disabled
          />
        </div>
      )}
    </div>
  );
}
