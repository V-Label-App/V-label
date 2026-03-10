import { create } from 'zustand';

export interface ImageTask {
    id: string;
    filename: string;
    status: 'assigned' | 'in_progress' | 'submitted' | 'rejected' | 'approved' | 'skipped';
    thumbnail: string;  // URL or emoji for mock
    annotationCount: number;
    url?: string;       // Full image URL
}

interface ImageState {
    images: ImageTask[];
    currentIndex: number;
    autoSaveStatus: 'saved' | 'saving' | 'unsaved';

    // Actions
    setImages: (images: ImageTask[]) => void;
    updateImages: (images: ImageTask[]) => void; // Update images without resetting index
    goToNext: () => void;
    goToPrevious: () => void;
    jumpToImage: (index: number) => void;
    getCurrentImage: () => ImageTask | null;
    setAutoSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void;
    hasNext: () => boolean;
    hasPrevious: () => boolean;
}

export const useImageStore = create<ImageState>((set, get) => ({
    images: [],
    currentIndex: 0,
    autoSaveStatus: 'saved',

    setImages: (images) => set({ images, currentIndex: 0 }),

    updateImages: (images) => {
        // Update images without resetting currentIndex
        // Useful when navigating between tasks in the same project
        const { currentIndex } = get();
        const validIndex = Math.min(currentIndex, images.length - 1);
        set({ images, currentIndex: Math.max(0, validIndex) });
    },

    goToNext: () => {
        const { currentIndex, images } = get();
        if (currentIndex < images.length - 1) {
            set({ currentIndex: currentIndex + 1 });
        }
    },

    goToPrevious: () => {
        const { currentIndex } = get();
        if (currentIndex > 0) {
            set({ currentIndex: currentIndex - 1 });
        }
    },

    jumpToImage: (index) => {
        const { images } = get();
        if (index >= 0 && index < images.length) {
            set({ currentIndex: index });
        }
    },

    getCurrentImage: () => {
        const { images, currentIndex } = get();
        return images[currentIndex] || null;
    },

    setAutoSaveStatus: (status) => set({ autoSaveStatus: status }),

    hasNext: () => {
        const { currentIndex, images } = get();
        return currentIndex < images.length - 1;
    },

    hasPrevious: () => {
        const { currentIndex } = get();
        return currentIndex > 0;
    },
}));
