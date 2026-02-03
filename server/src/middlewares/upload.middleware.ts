import multer from 'multer'

// Configure multer to use memory storage
// We want to process the file (resize/format) or upload to Cloudinary directly from memory
const storage = multer.memoryStorage()

// File filter to process only images
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true)
    } else {
        cb(new Error('Not an image! Please upload only images.'))
    }
}

export const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
})
