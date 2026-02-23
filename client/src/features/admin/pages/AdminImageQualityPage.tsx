import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Slider } from "../../../components/ui/slider";
import { toast } from "sonner";
import { systemApi, type ImageQualityConfig } from "../../../services/system.api";
import { Loader2, Save, Undo2, Info } from "lucide-react";
import { motion } from "framer-motion";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../../../components/ui/tooltip";

export function AdminImageQualityPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState<ImageQualityConfig>({
        minResolution: 100,
        minBrightness: 25,
        maxBrightness: 245,
        blurThreshold: 25
    });

    // Keep original for reset
    const [originalConfig, setOriginalConfig] = useState<ImageQualityConfig | null>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const data = await systemApi.getAdminImageQualityConfig();
            setConfig(data);
            setOriginalConfig(data);
        } catch (error) {
            console.error("Failed to fetch image quality config", error);
            toast.error("Failed to load configuration");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            await systemApi.updateImageQualityConfig(config);
            setOriginalConfig(config);
            toast.success("Image quality settings updated successfully");
        } catch (error) {
            console.error("Failed to update config", error);
            toast.error("Failed to update configuration");
        } finally {
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (originalConfig) {
            setConfig(originalConfig);
            toast.info("Changes reset to last saved state");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        );
    }

    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="max-w-4xl mx-auto space-y-6"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Image Quality Control</h2>
                    <p className="text-muted-foreground">
                        Configure global thresholds for automatic image quality verification.
                    </p>
                </div>
                <div className="flex gap-2">
                    {hasChanges && (
                        <Button variant="outline" onClick={handleReset} disabled={saving}>
                            <Undo2 className="w-4 h-4 mr-2" />
                            Reset
                        </Button>
                    )}
                    <Button onClick={handleSave} disabled={saving || !hasChanges} className="bg-blue-600 hover:bg-blue-700">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Resolution Gate
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="w-4 h-4 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Minimum width or height required for an image to be accepted.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle>
                        <CardDescription>
                            Ensure uploaded images meet minimum size requirements for annotation.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div>
                                    <Label htmlFor="min-res">Minimum Dimension (px)</Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Images smaller than <span className="font-medium text-blue-600">{config.minResolution}x{config.minResolution}</span> will be rejected.
                                    </p>
                                </div>
                                <div className="flex items-end gap-2 text-xs text-muted-foreground border p-2 rounded-md bg-slate-50">
                                    <div
                                        className="bg-blue-500 rounded-sm transition-all duration-300 ease-out"
                                        style={{
                                            width: `${Math.max(4, config.minResolution / 5)}px`,
                                            height: `${Math.max(4, config.minResolution / 5)}px`
                                        }}
                                    />
                                    <span className="mb-[-2px]">Preview (1:5 scale)</span>
                                </div>
                            </div>

                            <Slider
                                id="min-res"
                                min={50}
                                max={1000}
                                step={10}
                                value={[config.minResolution]}
                                onValueChange={(val) => setConfig({ ...config, minResolution: val[0] })}
                                className="py-4"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>50px</span>
                                <span>1000px</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            Blur Detection
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger>
                                        <Info className="w-4 h-4 text-gray-400" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="max-w-xs">Higher threshold = Stricter check. Images must be very sharp to pass.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardTitle>
                        <CardDescription>
                            Filter out blurry images.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between">
                                <Label htmlFor="blur">Strictness Threshold: <span className="text-blue-600">{config.blurThreshold}</span></Label>
                            </div>

                            {/* Visual Strictness Bar */}
                            <div className="relative h-2 rounded-full overflow-hidden bg-gray-100">
                                <div className="absolute inset-0 bg-gradient-to-r from-green-300 via-yellow-300 to-red-400 opacity-50" />
                                <div
                                    className="absolute top-0 bottom-0 w-2 bg-blue-600 shadow-lg transform -translate-x-1/2 transition-all"
                                    style={{ left: `${(config.blurThreshold / 500) * 100}%` }}
                                />
                            </div>

                            <Slider
                                id="blur"
                                min={0}
                                max={500}
                                step={5}
                                value={[config.blurThreshold]}
                                onValueChange={(val) => setConfig({ ...config, blurThreshold: val[0] })}
                                className="py-4"
                            />

                            <div className="flex justify-between text-xs text-muted-foreground px-1">
                                <div className="text-left">
                                    <span className="block font-medium text-gray-700">Forgiving</span>
                                    Accepts slightly blurry images
                                </div>
                                <div className="text-right">
                                    <span className="block font-medium text-gray-700">Strict</span>
                                    Accepts only sharp images
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Brightness Range</CardTitle>
                        <CardDescription>
                            Define the acceptable brightness range (0-255).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label>Acceptable Range</Label>
                                <span className="text-sm font-medium bg-secondary px-2 py-1 rounded">
                                    {config.minBrightness} (Darkest) - {config.maxBrightness} (Brightest)
                                </span>
                            </div>

                            {/* Visual Gradient Bar with "Zones" */}
                            <div className="space-y-2">
                                <div className="h-6 rounded-md w-full relative mt-4 overflow-hidden border border-gray-300 shadow-inner">
                                    {/* Base Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-black via-gray-500 to-white" />

                                    {/* Rejected Zones Overlay (Red Hatch) */}
                                    <div
                                        className="absolute top-0 bottom-0 bg-red-500/30 border-r border-red-500 backdrop-blur-[1px]"
                                        style={{ width: `${(config.minBrightness / 255) * 100}%` }}
                                    />
                                    <div
                                        className="absolute top-0 bottom-0 right-0 bg-red-500/30 border-l border-red-500 backdrop-blur-[1px]"
                                        style={{ width: `${100 - (config.maxBrightness / 255) * 100}%` }}
                                    />

                                    {/* Safe Zone Indicator (Green Line at bottom) */}
                                    <div
                                        className="absolute bottom-0 h-1 bg-green-500 z-10 transition-all"
                                        style={{
                                            left: `${(config.minBrightness / 255) * 100}%`,
                                            right: `${100 - (config.maxBrightness / 255) * 100}%`
                                        }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs font-medium text-gray-500 px-1">
                                    <span className="text-red-500">Rejected (Too Dark)</span>
                                    <span className="text-green-600">Accepted Zone</span>
                                    <span className="text-red-500">Rejected (Too Bright)</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 pt-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Min Brightness Threshold</Label>
                                    <div className="flex gap-4 items-center">
                                        <Slider
                                            min={0}
                                            max={127}
                                            step={1}
                                            value={[config.minBrightness]}
                                            onValueChange={(val) => setConfig({ ...config, minBrightness: val[0] })}
                                            className="flex-1"
                                        />
                                        <Input
                                            type="number"
                                            value={config.minBrightness}
                                            onChange={(e) => setConfig({ ...config, minBrightness: parseInt(e.target.value) || 0 })}
                                            className="w-16 h-8 text-center"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Max Brightness Threshold</Label>
                                    <div className="flex gap-4 items-center">
                                        <Slider
                                            min={128}
                                            max={255}
                                            step={1}
                                            value={[config.maxBrightness]}
                                            onValueChange={(val) => setConfig({ ...config, maxBrightness: val[0] })}
                                            className="flex-1"
                                        />
                                        <Input
                                            type="number"
                                            value={config.maxBrightness}
                                            onChange={(e) => setConfig({ ...config, maxBrightness: parseInt(e.target.value) || 255 })}
                                            className="w-16 h-8 text-center"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </motion.div>
    );
}
