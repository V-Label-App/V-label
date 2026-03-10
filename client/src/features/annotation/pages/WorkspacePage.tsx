import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WorkspaceHeader } from '../components/workspace/WorkspaceHeader';
import { WorkspaceToolbar } from '../components/workspace/WorkspaceToolbar';
import { WorkspaceCanvas } from '../components/canvas/WorkspaceCanvas';
import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar';
import { ImageNavigator } from '../components/workspace/ImageNavigator';
import { useImageStore, useAnnotationStore } from '../stores';
import type { ImageTask } from '../stores';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useWorkspaceData } from '../hooks/useWorkspaceData';

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
    const { setImages, getCurrentImage } = useImageStore();
    const { clearAnnotations, setAnnotations, annotations } = useAnnotationStore();
    const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

    // Validate taskId
    if (!taskId) {
        throw new Error('Task ID is required');
    }

    // Load task data from API
    const { loading, error, taskData } = useWorkspaceData(taskId);

    const isReadOnly = taskStatus === 'approved' || mode === 'review';

    // Initialize keyboard shortcuts
    useKeyboardShortcuts(isReadOnly);

    // Load task data into stores when available
    useEffect(() => {
        if (taskData) {
            // Convert task data to ImageTask format
            const imageTask: ImageTask = {
                id: taskData.taskId,
                filename: taskData.image.filename,
                status: taskData.status.toLowerCase() as ImageTask['status'],
                url: taskData.image.url,
                thumbnail: taskData.image.url,
                annotationCount: taskData.annotations.length
            };

            // Set images in store
            setImages([imageTask]);

            // Load existing annotations if any
            if (taskData.annotations && Array.isArray(taskData.annotations)) {
                setAnnotations(taskData.annotations);
            } else {
                clearAnnotations();
            }
        }
    }, [taskData, setImages, setAnnotations, clearAnnotations]);

    // TODO: Auto-save will be implemented by another team member

    // Timer for tracking work time
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const currentImage = getCurrentImage();

    const handleSubmit = async () => {
        // Validate before submit
        if (annotations.length === 0) {
            alert('Please add at least one annotation before submitting');
            return;
        }

        // Check if all annotations have labels
        const hasUnlabeledAnnotations = annotations.some(ann => !ann.label);
        if (hasUnlabeledAnnotations) {
            alert('Please assign labels to all annotations before submitting');
            return;
        }

        // TODO: Submit API call will be implemented by another team member
        alert('Submit functionality will be implemented by another team member');
    };

    const handleSkip = async () => {
        if (confirm('Are you sure you want to skip this task?')) {
            // TODO: Skip API call will be implemented by another team member
            alert('Skip functionality will be implemented by another team member');
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

    // Loading state
    if (loading) {
        return (
            <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
                <div className="text-white text-lg">Loading task data...</div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">Failed to load task</div>
                    <div className="text-gray-400 mb-4">{error.message}</div>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // No image data
    if (!currentImage || !taskData) {
        return (
            <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
                <div className="text-white">No task data available</div>
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
