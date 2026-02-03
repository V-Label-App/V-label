# Research: Cloudinary Implementation

**Feature**: Cloudinary Integration
**Date**: 2026-02-03

## 1. Technical Decisions

### Decision 1: Cloudinary Node.js SDK
- **Choice**: Use the official `cloudinary` npm package (v2).
- **Rationale**: Provides comprehensive API coverage, ease of use with robust documentation, and is the standard way to integrate Cloudinary in Node.js.
- **Alternatives Considered**:
  - Direct REST API calls: Rejected due to increased complexity in handling signatures and multipart uploads manually.
  - Third-party wrappers: Rejected to avoid unnecessary dependencies and potential maintenance issues.

### Decision 2: Upload Strategy
- **Choice**: Server-side upload (Stream/Buffer).
- **Rationale**:
  - **Security**: Keeps API secrets hidden on the server.
  - **Control**: Allows backend to validate files (size, type) and associate metadata with database records atomically before confirming success to the client.
  - **Simplicity**: Integrates well with existing `multer` middleware.
- **Alternatives Considered**:
  - Client-side signed uploads: Reduces server load but increases frontend complexity and exposes upload logic logic directly to client manipulation (though signed is secure, flow control is harder). For the current scale and V-Label requirements (PostgreSQL atomic updates), server-side is safer and simpler.

### Decision 3: Image Transformations
- **Choice**: Apply `f_auto,q_auto` on upload or deliver URLs with these parameters.
- **Rationale**:
  - `f_auto`: Automatically selects the best format (WebP/AVIF) for the requesting browser.
  - `q_auto`: Optimizes quality/size balance intelligently.
  - **Note**: Best practice is to store the "raw" public ID and generate transformation URLs on the fly or request them, but applying default optimization ensures base delivery is always efficient.

## 2. Unknowns Resolution

*No major unknowns identified in Spec or Plan.*

## 3. Best Practices (Node.js + Cloudinary)

- **Environment Variables**: Store `CLOUDINARY_URL` or individual credentials in `.env`.
- **Async/Await**: Use `cloudinary.uploader.upload` (v2) which supports Promises.
- **Streaming**: For large files/high concurrency, using `upload_stream` pipes from the multer buffer/stream avoids loading entire files into memory if possible, though `multer.memoryStorage()` is fine for smaller image batches typical in annotation tasks (~5-10MB).
- **Resource Cleanup**: If DB insert fails after upload, schedule a deletion of the uploaded image to prevent orphans.
