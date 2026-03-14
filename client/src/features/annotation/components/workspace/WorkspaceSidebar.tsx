import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { RegionsList } from "../sidebar/RegionsList";
import { DiscussionPanel } from "../sidebar/DiscussionPanel";
import { useAnnotationStore, useCanvasStore } from "../../stores";
import { LabelRequestModel } from "./LabelRequestModel";
import { Button } from "../../../../components/ui/button";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

interface WorkspaceSidebarProps {
  isReadOnly?: boolean;
  initialTab?: "regions" | "discussion";
  projectId?: string;
}

export function WorkspaceSidebar({
  isReadOnly = false,
  initialTab = "regions",
  projectId,
}: WorkspaceSidebarProps) {
  const { annotations } = useAnnotationStore();
  const { setModalOpen } = useCanvasStore();
  const [isRequestModelOpen, setIsRequestModelOpen] = useState(false);

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col shadow-xl">
      <Tabs defaultValue={initialTab} className="flex-1 flex flex-col h-full">
        <TabsList className="w-full rounded-none bg-slate-900 border-b border-slate-700 grid grid-cols-2 p-0 h-10">
          <TabsTrigger
            value="regions"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"
          >
            Regions ({annotations.length})
          </TabsTrigger>
          <TabsTrigger
            value="discussion"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-slate-800 data-[state=active]:text-white text-slate-400"
          >
            Discussion
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
