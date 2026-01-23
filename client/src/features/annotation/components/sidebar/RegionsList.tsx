import { Square } from 'lucide-react';
import { useAnnotationStore } from '../../stores';
import { RegionCard } from './RegionCard';

interface RegionsListProps {
    isReadOnly?: boolean;
}

export function RegionsList({ isReadOnly = false }: RegionsListProps) {
    const { annotations } = useAnnotationStore();

    if (annotations.length === 0) {
        return (
            <div className="text-center py-12 text-slate-400">
                <Square className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No annotations yet</p>
                {!isReadOnly && <p className="text-xs mt-1">Press R to start drawing</p>}
            </div>
        );
    }

    return (
        <div className="space-y-2 overflow-y-auto max-h-full">
            {annotations.map((annotation, index) => (
                <RegionCard
                    key={annotation.id}
                    annotation={annotation}
                    index={index}
                    isReadOnly={isReadOnly}
                />
            ))}
        </div>
    );
}
