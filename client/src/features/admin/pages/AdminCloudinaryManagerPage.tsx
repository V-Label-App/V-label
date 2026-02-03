import { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Loader2, ExternalLink, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../api/axiosClient';

interface CloudinaryResource {
    public_id: string;
    format: string;
    bytes: number;
    width: number;
    height: number;
    url: string;
    secure_url: string;
    created_at: string;
}

interface ApiResponse {
    resources: CloudinaryResource[];
    next_cursor?: string;
}

export function AdminCloudinaryManagerPage() {
    const [resources, setResources] = useState<CloudinaryResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [cursorHistory, setCursorHistory] = useState<string[]>([]);
    const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);

    const fetchResources = async (cursor?: string) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (cursor) params.append('cursor', cursor);
            params.append('maxResults', '12');

            const response = await api.get(`/admin/cloudinary-resources?${params.toString()}`);
            const data: ApiResponse = response.data;

            setResources(data.resources);
            setNextCursor(data.next_cursor || null);
        } catch (error) {
            console.error('Failed to fetch resources:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchResources(currentCursor);
    }, [currentCursor]);

    const handleNext = () => {
        if (nextCursor) {
            setCursorHistory(prev => [...prev, currentCursor || '']);
            setCurrentCursor(nextCursor);
        }
    };

    const handlePrev = () => {
        if (cursorHistory.length > 0) {
            const prevCursor = cursorHistory[cursorHistory.length - 1];
            const newHistory = cursorHistory.slice(0, -1);
            setCursorHistory(newHistory);
            setCurrentCursor(prevCursor === '' ? undefined : prevCursor);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Cloudinary Media</h2>
                    <p className="text-muted-foreground">Manage all images stored in Cloudinary</p>
                </div>
            </div>

            {loading && resources.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {resources.map((resource) => (
                            <Card key={resource.public_id} className="overflow-hidden group">
                                <div className="aspect-square relative bg-gray-100">
                                    <img
                                        src={resource.secure_url}
                                        alt={resource.public_id}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={() => window.open(resource.secure_url, '_blank')}
                                            className="h-8 w-8 p-0"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-1 mb-1" title={resource.public_id}>
                                        <ImageIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                        <p className="text-sm font-medium truncate">{resource.public_id.split('/').pop()}</p>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>{resource.format.toUpperCase()}</span>
                                        <span>{formatSize(resource.bytes)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                        <span>{resource.width}x{resource.height}</span>
                                        <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {resources.length === 0 && !loading && (
                        <div className="text-center py-12 text-muted-foreground">
                            No images found
                        </div>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-4">
                        <Button
                            variant="outline"
                            onClick={handlePrev}
                            disabled={cursorHistory.length === 0 || loading}
                        >
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Previous
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {loading ? 'Loading...' : 'Showing results'}
                        </span>
                        <Button
                            variant="outline"
                            onClick={handleNext}
                            disabled={!nextCursor || loading}
                        >
                            Next
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
