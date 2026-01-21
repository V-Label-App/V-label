import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader';
import { WorkspaceToolbar } from '../components/workspace/WorkspaceToolbar';
import { WorkspaceCanvas } from '../components/canvas/WorkspaceCanvas';
import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar';
import { ImageNavigator } from '../components/workspace/ImageNavigator';
import { useImageStore, useAnnotationStore } from '../stores';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { mockImages } from '../mockData';

interface WorkspacePageProps {
    mode?: 'annotate' | 'review';
    taskStatus?: 'assigned' | 'in_progress' | 'submitted' | 'rejected' | 'approved';
}

export function WorkspacePage({
    mode = 'annotate',
    taskStatus = 'assigned',
}: WorkspacePageProps) {
    const { taskId } = useParams<{ taskId: string }>();
    const navigate = useNavigate();
    const { setImages, getCurrentImage, currentIndex } = useImageStore();
    const { clearAnnotations } = useAnnotationStore();

    const isReadOnly = taskStatus === 'approved' || mode === 'review';

    // Initialize keyboard shortcuts
    useKeyboardShortcuts(isReadOnly);

    // Load mock images on mount
    useEffect(() => {
        setImages(mockImages);

        // If taskId is provided, find and jump to that image
        if (taskId) {
            const imageIndex = mockImages.findIndex(img => img.id === taskId);
            if (imageIndex !== -1) {
                useImageStore.getState().jumpToImage(imageIndex);
            }
        }
    }, [taskId, setImages]);

    // Clear annotations when image changes
    useEffect(() => {
        clearAnnotations();
        // In real app, load annotations for current image here
    }, [currentIndex, clearAnnotations]);

    const currentImage = getCurrentImage();

    const handleSubmit = () => {
        alert('Task submitted successfully!');
        navigate(-1);
    };

    const handleSkip = () => {
        if (confirm('Are you sure you want to skip this task?')) {
            alert('Task skipped!');
            navigate(-1);
        }
    };

    const handleApprove = () => {
        alert('Task approved!');
        navigate(-1);
    };

    const handleReject = () => {
        const reason = prompt('Please provide a rejection reason:');
        if (reason && reason.trim()) {
            alert(`Task rejected. Reason: ${reason}`);
            navigate(-1);
        }
    };

    const handleClose = () => {
        navigate(-1);
    };

    if (!currentImage) {
        return (
            <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
                <div className="text-white">Loading...</div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-slate-900 z-50 overflow-hidden flex flex-col"
        >
            {/* Header */}
            <WorkspaceHeader
                mode={mode}
                taskStatus={taskStatus}
                onSubmit={handleSubmit}
                onSkip={handleSkip}
                onApprove={handleApprove}
                onReject={handleReject}
                onClose={handleClose}
            />

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Toolbar */}
                <WorkspaceToolbar isReadOnly={isReadOnly} />

                {/* Canvas */}
                <div className="flex-1 relative">
                    <WorkspaceCanvas
                        imageUrl={currentImage.url || ''}
                        isReadOnly={isReadOnly}
                    />

                    {/* Image Navigator */}
                    <ImageNavigator />
                </div>

                {/* Sidebar */}
                <WorkspaceSidebar
                    isReadOnly={isReadOnly}
                    initialTab={taskStatus === 'rejected' ? 'discussion' : 'regions'}
                />
            </div>
        </motion.div>
    );
}
