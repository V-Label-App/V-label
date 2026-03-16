import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { RegionsList } from "../sidebar/RegionsList";
import { DiscussionPanel } from "../sidebar/DiscussionPanel";
import { useAnnotationStore, useCanvasStore } from "../../stores";
import type { Annotation } from "../../stores";
import { LabelRequestModel } from "./LabelRequestModel";
import { Button } from "../../../../components/ui/button";
import { PlusCircle, History as HistoryIcon, ChevronRight } from "lucide-react";
import { useState } from "react";
import { HistoryPanel } from "../sidebar/HistoryPanel";
import type { SubmissionHistoryItem } from "../../../../services/annotator.api";

interface WorkspaceSidebarProps {
  isReadOnly?: boolean;
  initialTab?: "regions" | "discussion" | "history";
  projectId?: string;
  history?: SubmissionHistoryItem[];
  onPreviewAnnotations?: (annotations: Annotation[], submissionNumber: number) => void;
  onRestoreCurrent?: () => void;
  previewingSubmission?: number | null;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WorkspaceSidebar({
  isReadOnly = false,
  initialTab = "regions",
  projectId,
  history = [],
  onPreviewAnnotations,
  onRestoreCurrent,
  previewingSubmission = null,
  isCollapsed = false,
  onToggleCollapse,
}: WorkspaceSidebarProps) {
  const { annotations } = useAnnotationStore();
  const { setModalOpen } = useCanvasStore();
  const [isRequestModelOpen, setIsRequestModelOpen] = useState(false);

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col shadow-xl relative h-full">
      {/* Collapse Toggle Button */}
      {!isCollapsed && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-50 w-8 h-12 p-0 bg-blue-600/90 hover:bg-blue-600 border border-blue-500/50 border-r-0 rounded-l-xl text-white shadow-[0_0_15px_rgba(37,99,235,0.3)] group transition-all duration-300"
          title="Collapse Sidebar"
        >
          <ChevronRight className="w-5 h-5 transition-transform group-hover:scale-110" />
        </Button>
      )}

      <Tabs defaultValue={initialTab} className="flex-1 flex flex-col h-full overflow-hidden">
        <TabsList className="w-full rounded-none bg-slate-900 border-b border-slate-700 grid grid-cols-3 p-0 h-10">
          <TabsTrigger
            value="regions"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 text-xs"
          >
            Regions ({annotations.length})
          </TabsTrigger>
          <TabsTrigger
            value="discussion"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 text-xs"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400 text-xs"
          >
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="regions"
          className="flex-1 overflow-hidden m-0 p-4 flex flex-col gap-3"
        >
          <div className="flex justify-between items-center bg-slate-900 p-2 rounded-md border border-slate-700 select-none">
            <span className="text-slate-300 text-sm font-medium px-2">
              Labels
            </span>
            {!isReadOnly && projectId && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs bg-slate-800 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                onClick={() => {
                  setModalOpen(true);
                  setIsRequestModelOpen(true);
                }}
              >
                <PlusCircle className="w-3.5 h-3.5 mr-1" /> Request Label
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <RegionsList isReadOnly={isReadOnly} />
          </div>
        </TabsContent>

        <TabsContent
          value="discussion"
          className="flex-1 overflow-hidden m-0 p-4 flex flex-col gap-3"
        >
          <div className="flex-1 overflow-y-auto min-h-0">
            <DiscussionPanel isReadOnly={isReadOnly} />
          </div>
        </TabsContent>

        <TabsContent
          value="history"
          className="flex-1 overflow-hidden m-0 p-4 flex flex-col gap-3"
        >
          <div className="flex justify-between items-center bg-slate-900 p-2 rounded-md border border-slate-700 select-none">
            <span className="text-slate-300 text-sm font-medium px-2 flex items-center gap-2">
              <HistoryIcon className="w-3.5 h-3.5" /> Task History
            </span>
          </div>
          <div className="flex-1 overflow-hidden min-h-0">
            <HistoryPanel
              history={history}
              onPreviewAnnotations={onPreviewAnnotations}
              onRestoreCurrent={onRestoreCurrent}
              previewingSubmission={previewingSubmission}
            />
          </div>
        </TabsContent>
      </Tabs>

      {projectId && (
        <LabelRequestModel
          isOpen={isRequestModelOpen}
          onClose={() => {
            setModalOpen(false);
            setIsRequestModelOpen(false);
          }}
          projectId={projectId}
        />
      )}
    </div>
  );
}
