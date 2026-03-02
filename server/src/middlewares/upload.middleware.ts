import multer from 'multer'

// Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB per image
const MAX_ZIP_SIZE = 500 * 1024 * 1024  // 500MB for ZIP
const MAX_FILES_LIMIT = 200              // Max 200 images

// Configure multer to use memory storage
const storage = multer.memoryStorage()

// File filter for images (ORIGINAL - không thay đổi)
const imageFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Not an image! Please upload only images.'))
    }
}

// File filter for ZIP (MỚI THÊM)
const zipFileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = ['application/zip', 'application/x-zip-compressed', 'application/x-zip']
    
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true)
    } else {
        cb(new Error('Only ZIP files are allowed'))
    }
}

/**
 * Multer middleware for uploading images (ORIGINAL - giữ nguyên)
 */
export const uploadMiddleware = multer({
    storage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit (giữ nguyên như cũ)
    },
})

/**
 * Multer middleware for uploading ZIP file (MỚI THÊM)
 */
export const uploadZip = multer({
    storage,
    fileFilter: zipFileFilter,
    limits: {
        fileSize: MAX_ZIP_SIZE
    }
})
