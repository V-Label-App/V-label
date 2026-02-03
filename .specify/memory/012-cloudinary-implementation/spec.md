# Specification: Cloudinary Implementation for Image Uploads

## 1. Overview

### 1.1 Feature Description
Implement Cloudinary integration for handling image uploads in the V-Label application. This feature provides a robust, scalable cloud storage solution with built-in image optimization and transformation capabilities, replacing the need for local or raw S3 storage management for image assets.

### 1.2 User Value / Motivation
- **For Annotators**: Faster image loading times due to CDN delivery and automatic format optimization (WebP/AVIF), ensuring a smoother annotation experience even with large datasets.
- **For Managers**: Reliable image storage without worrying about server disk space limits.
- **For Developers**: Simplified image management workflow (upload, transform, delivery) via Cloudinary's comprehensive API, reducing maintenance overhead compared to managing raw storage buckets.

### 1.3 Scope
**In Scope:**
- Integration of Cloudinary Node.js SDK into the backend.
- Implementation of image upload functionality to Cloudinary.
- Backend API update to store Cloudinary public URLs in the database.
- Configuration of Cloudinary credentials via environment variables.
- Utilization of Cloudinary's auto-optimization for image delivery.

**Out of Scope:**
- Migration of existing images (if any) to Cloudinary (assumed fresh start for this feature context or handled separately).
- Advanced image manipulation features (filters, effects) beyond standard optimization for annotation.
- User-facing UI for managing Cloudinary setttings (configuration is dev-only).

### 1.4 Assumptions & Dependencies
- **Assumptions**:
    - Project uses Node.js for backend.
    - `multer` or similar middleware is available for parsing multipart/form-data.
    - Annotators have standard internet access to reach Cloudinary's CDN.
- **Dependencies**:
    - Cloudinary Account and API Credentials (Cloud Name, API Key, API Secret).
    - `cloudinary` npm package.
    - Existing backend `projects` and `images` data models.

## 2. User Scenarios

### 2.1 Scenario 1: Manager Uploads Dataset Images
**Actor**: Manager
**Pre-condition**: Manager is logged in and is on the "Project Details" page.
**Flow**:
1. Manager clicks "Upload Images" button.
2. Manager selects a batch of images from their local device.
3. System uploads images to backend.
4. Backend streams/uploads images to Cloudinary.
5. Cloudinary returns secure, optimized URLs.
6. System saves these URLs to the database linked to the project.
7. Manager sees the uploaded images appear in the project gallery.
**Post-condition**: Images are stored in Cloudinary, and database records reference these Cloudinary URLs.

### 2.2 Scenario 2: Annotator Views Image for Labeling
**Actor**: Annotator
**Pre-condition**: Annotator opens a task in the workspace.
**Flow**:
1. System fetches image URL from the database.
2. The URL points to Cloudinary's CDN.
3. Browser requests the image.
4. Cloudinary automatically serves the most optimal format (e.g., WebP) and size for the user's device/browser.
5. Image loads quickly in the annotation canvas.
**Post-condition**: High-quality, optimized image is displayed ready for annotation.

## 3. Functional Requirements

### 3.1 Backend Integration
- **FR1**: The system MUST integrate the `cloudinary` SDK.
- **FR2**: The system MUST implement a secure upload service that authenticates with Cloudinary using API keys stored in environment variables.
- **FR3**: The upload process MUST support standard image formats (JPG, PNG, WEBP).
- **FR4**: The system MUST store the returned secure URL (`secure_url`), public ID (`public_id`), and image metadata (width, height, format) in the `Image` database table.

### 3.2 Image Optimization
- **FR5**: The system MUST request images with `f_auto` (automatic format) and `q_auto` (automatic quality) transformations by default to optimize delivery.
- **FR6**: The system SHOULD organize uploads into specific folders (e.g., `v-label/{environment}/{project_id}`) for better management.

### 3.3 Error Handling
- **FR7**: The system MUST handle upload failures (e.g., network issues, invalid file types) gracefully and return appropriate error messages to the client.
- **FR8**: The system MUST ensure atomic operations where possible or cleanup orphaned Cloudinary files if the database record creation fails.

## 4. Success Criteria

| Metric | Target | Description |
|:---|:---|:---|
| **Upload Success Rate** | > 99% | Percentage of valid image upload attempts that are successfully stored and retrievable. |
| **Image Load Time** | < 1.0s | Average time to load a standard 1080p image in the annotation workspace (95th percentile). |
| **Storage Efficiency** | optimize | Images served via Cloudinary should be smaller in file size than the original upload (on average) without visible quality loss for annotation. |
| **Integration Validity** | Pass | All API endpoints for image upload function correctly with Cloudinary URL responses. |

## 5. Non-Functional Requirements

### 5.1 Security
- API Keys and Secrets MUST NOT be committed to version control.
- Env variables (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) MUST be used.
- Uploads SHOULD be restricted to authenticated users with appropriate permissions (Manager+).

### 5.2 Performance
- Uploads should be processed asynchronously or efficient streaming should be used to prevent blocking the Node.js event loop.
- CDN caching policies provided by Cloudinary should be leveraged.

### 5.3 Reliability
- The integration should be robust against temporary network glitches.

## 6. Data Entities

### 6.1 Database Schema Updates
*Note: This describes the logical data requirements.*

**Entity: Image** (Existing)
- **Attribute Update**: `url` field will now store the full Cloudinary secure URL.
- **New Attribute (Optional)**: `public_id` (String) - To store Cloudinary's unique identifier for easier management/deletion.
- **New Attribute (Optional)**: `provider` (Enum/String) - Value `CLOUDINARY` to distinguish from other storage types if hybrid storage is supported.

## 7. UI/UX Design
*Minimal changes expected, primarily backend logic.*
- **Upload Progress**: The standard upload progress bar should reflect the complete process (upload to server -> upload to Cloudinary).
