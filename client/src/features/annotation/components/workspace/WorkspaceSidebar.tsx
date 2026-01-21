import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { RegionsList } from '../sidebar/RegionsList';
import { DiscussionPanel } from '../sidebar/DiscussionPanel';
import { useAnnotationStore } from '../../stores';

interface WorkspaceSidebarProps {
    isReadOnly?: boolean;
    initialTab?: 'regions' | 'discussion';
}

export function WorkspaceSidebar({ isReadOnly = false, initialTab = 'regions' }: WorkspaceSidebarProps) {
    const { annotations } = useAnnotationStore();

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

                <TabsContent value="regions" className="flex-1 overflow-hidden m-0 p-4">
                    <RegionsList isReadOnly={isReadOnly} />
                </TabsContent>

                <TabsContent value="discussion" className="flex-1 overflow-hidden m-0 p-4">
                    <DiscussionPanel isReadOnly={isReadOnly} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
