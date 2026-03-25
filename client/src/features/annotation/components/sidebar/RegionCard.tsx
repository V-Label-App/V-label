import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger } from '../../../../components/ui/select';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useAnnotationStore, useLabelStore, useImageStore } from '../../stores';
import type { Annotation } from '../../stores';
import { getLabelColor } from '../../constants';
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
    
    const { labels } = useLabelStore();
    const { setHasInteracted } = useImageStore();

    const isSelected = selectedAnnotationId === annotation.id;

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
                                onValueChange={(value: string) => {
                                    updateAnnotation(annotation.id, { label: value });
                                    setHasInteracted(true);
                                }}
                            >
                                <SelectTrigger className="h-8 bg-slate-800 border-slate-600 text-white">
                                    <div className="flex items-center gap-2">
                                        <div 
                                            className="w-3 h-3 rounded-full flex-shrink-0" 
                                            style={{ backgroundColor: getLabelColor(annotation.label) }}
                                        />
                                        <span className="text-white">
                                            {annotation.label}
                                        </span>
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {labels.map(label => (
                                        <SelectItem key={label.id} value={label.name}>
                                            <div className="flex items-center gap-2">
                                                <div 
                                                    className="w-3 h-3 rounded-full flex-shrink-0" 
                                                    style={{ backgroundColor: label.color }}
                                                />
                                                <span>{label.name}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-3 h-3 rounded-full flex-shrink-0" 
                                    style={{ backgroundColor: getLabelColor(annotation.label) }}
                                />
                                <span className="text-white font-normal">
                                    {annotation.label}
                                </span>
                            </div>
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
                                // Optional: setHasInteracted(true) if visibility should trigger auto-save
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
                                setHasInteracted(true);
                            }}
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* AI Confidence Badge */}
            {annotation.aiSuggested && annotation.confidence !== undefined && (
                <div className="mt-2">
                    <span
                        className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
                            annotation.confidence >= 0.8
                                ? "bg-green-900/50 text-green-400 border border-green-700"
                                : annotation.confidence >= 0.6
                                    ? "bg-yellow-900/50 text-yellow-400 border border-yellow-700"
                                    : "bg-red-900/50 text-red-400 border border-red-700"
                        )}
                    >
                        ✦ AI {Math.round(annotation.confidence * 100)}% confidence
                    </span>
                </div>
            )}

            {/* Coordinates */}
            <div className="mt-2 text-xs text-slate-500 font-mono">
                {Math.round(annotation.x)}, {Math.round(annotation.y)} • {Math.round(annotation.width)}×{Math.round(annotation.height)}
            </div>

            {/* Note Input */}
            {!isReadOnly && (
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                    <input
                        placeholder="Add note..."
                        value={annotation.labelNote || ""}
                        onChange={(e) => {
                            updateAnnotation(annotation.id, { labelNote: e.target.value });
                            setHasInteracted(true);
                        }}
                        className="w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500 focus:text-white placeholder:text-slate-600 transition-colors"
                    />
                </div>
            )}
            {isReadOnly && annotation.labelNote && (
                <div className="mt-2 text-[10px] text-slate-400 italic bg-slate-800/50 p-1.5 rounded border border-slate-700/50">
                    "{annotation.labelNote}"
                </div>
            )}
        </Card>
    );
}
