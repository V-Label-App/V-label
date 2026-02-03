import cloudinary from '../config/cloudinary.js'
import logger from '../utils/logger.js'
import { Readable } from 'stream'

export interface CloudinaryUploadResult {
    public_id: string
    secure_url: string
    format: string
    width: number
    height: number
    bytes: number
}

export class ImageService {
    /**
     * Upload an image buffer to Cloudinary using streams
     * @param buffer - Key file buffer
     * @param folder - Folder path in Cloudinary (default: 'v-label/uploads')
     * @returns Promise<CloudinaryUploadResult>
     */
    static async uploadImage(
        buffer: Buffer,
        folder: string = 'v-label/uploads'
    ): Promise<CloudinaryUploadResult> {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: 'image',
                    // Default optimization
                    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
                },
                (error, result) => {
                    if (error) {
                        logger.error('IMAGE', 'Cloudinary upload failed', error)
                        return reject(error)
                    }

                    if (!result) {
                        return reject(new Error('Cloudinary upload returned undefined result'))
                    }

                    // Resolve with relevant data
                    resolve({
                        public_id: result.public_id,
                        secure_url: result.secure_url,
                        format: result.format,
                        width: result.width,
                        height: result.height,
                        bytes: result.bytes,
                    })
                }
            )

            // Convert buffer to stream and pipe to Cloudinary
            const stream = Readable.from(buffer)
            stream.pipe(uploadStream)
        })
    }

    /**
     * Generate an optimized URL for an image
     * @param publicId - Image public ID
     * @returns Optimized URL string
     */
    static getOptimizedUrl(publicId: string): string {
        return cloudinary.url(publicId, {
            fetch_format: 'auto',
            quality: 'auto',
        })
    }

    /**
     * Delete an image from Cloudinary
     * @param publicId - Image public ID
     */
    static async deleteImage(publicId: string): Promise<void> {
        try {
            await cloudinary.uploader.destroy(publicId)
            logger.info('IMAGE', `Deleted image from Cloudinary: ${publicId}`)
        } catch (error) {
            logger.error('IMAGE', 'Cloudinary delete failed', error)
            // We don't throw here to avoid blocking main deletion flows, just log
        }
    }
    /**
     * Get Cloudinary usage statistics
     */
    static async getUsage(): Promise<any> {
        return new Promise((resolve, reject) => {
            cloudinary.api.usage(
                (error: any, result: any) => {
                    if (error) {
                        logger.error('IMAGE', 'Cloudinary usage fetch failed', error)
                        return reject(error)
                    }
                    resolve(result)
                }
            )
        })
    }

    /**
     * List images from Cloudinary
     */
    static async getImages(cursor?: string, maxResults: number = 20, folder?: string): Promise<{ resources: any[], next_cursor?: string }> {
        return new Promise((resolve, reject) => {
            const options: any = {
                max_results: maxResults,
                type: 'upload',
                prefix: folder // specific folder
            }

            if (cursor) {
                options.next_cursor = cursor
            }

            cloudinary.api.resources(
                options,
                (error: any, result: any) => {
                    if (error) {
                        logger.error('IMAGE', 'Cloudinary resources fetch failed', error)
                        return reject(error)
                    }
                    resolve({
                        resources: result.resources,
                        next_cursor: result.next_cursor
                    })
                }
            )
        })
    }
}
