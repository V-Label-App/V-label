import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../../components/ui/select';
import { Badge } from '../../../../components/ui/badge';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useAnnotationStore } from '../../stores';
import type { Annotation } from '../../stores';
import { labelColors, availableLabels } from '../../constants';
import { cn } from '../../../../components/ui/utils';

interface RegionCardProps {
    annotation: Annotation;
    index: number;
    isReadOnly?: boolean;
}

export function RegionCard({ annotation, index, isReadOnly = false }: RegionCardProps) {
    const {
        selectedAnnotationId,
        selectAnnotation,
        updateAnnotation,
        deleteAnnotation,
        toggleVisibility,
    } = useAnnotationStore();

    const isSelected = selectedAnnotationId === annotation.id;
    const colors = labelColors[annotation.label];

    return (
        <Card
            className={cn(
                "p-3 cursor-pointer transition-all",
                isSelected
                    ? "bg-slate-700 border-blue-500 border-2"
                    : "bg-slate-900 border-slate-700 hover:bg-slate-700",
                isReadOnly && "pointer-events-none opacity-60"
            )}
            onClick={() => !isReadOnly && selectAnnotation(annotation.id)}
        >
            <div className="flex items-start justify-between gap-2">
                {/* Index & Label */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-slate-400 text-sm font-mono">#{index + 1}</span>
                    <div className="flex-1 min-w-0">
                        {isSelected && !isReadOnly ? (
                            <Select
                                value={annotation.label}
                                onValueChange={(value: string) => updateAnnotation(annotation.id, { label: value })}
                            >
                                <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableLabels.map(label => (
                                        <SelectItem key={label} value={label}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Badge className={colors.bg}>{annotation.label}</Badge>
                        )}
                    </div>
                </div>

                {/* Actions */}
                {!isReadOnly && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-white"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleVisibility(annotation.id);
                            }}
                        >
                            {annotation.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-red-400"
                            onClick={(e) => {
                                e.stopPropagation();
                                deleteAnnotation(annotation.id);
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Coordinates */}
            <div className="mt-2 text-xs text-slate-500 font-mono">
                {Math.round(annotation.x)}, {Math.round(annotation.y)} • {Math.round(annotation.width)}×{Math.round(annotation.height)}
            </div>
        </Card>
    );
}
