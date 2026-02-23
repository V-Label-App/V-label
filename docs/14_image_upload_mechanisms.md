# Image Upload Mechanisms

This document explains the technical details behind the **Duplicate Image Detection** and **Image Quality Analysis** features in V-Label.

## 1. Duplicate Image Detection

To prevent redundant data storage and ensure dataset integrity, V-Label strictly prevents uploading the exact same image file twice within the same project.

### Mechanism
The detection is performed on the **Server-side** during the upload request (`POST /api/v1/projects/:id/images`).

1.  **Hashing**: When a file is received, the server calculates an **MD5 checksum** (hash) of the file's binary buffer.
    ```typescript
    const checksum = crypto.createHash('md5').update(req.file.buffer).digest('hex');
    ```
2.  **Lookup**: The system queries the database for an existing image record that matches **both**:
    *   The current `projectId`.
    *   The calculated `checksum`.
3.  **Validation**:
    *   **If found**: The upload is rejected immediately with a `409 Conflict` error. The response includes details about the existing image (ID, URL, Filename) so the client can notify the user.
    *   **If not found**: The process continues to upload the file to Cloudinary and save the new record.

### Scope
*   **Per-Project**: An image can be uploaded to Project A and Project B (since they are different contexts), but it cannot be uploaded to Project A twice.
*   **Exact Binary Match**: The check is based on file content, not filename. Renaming a file will not bypass this check if the content remains identical.

---

## 2. Image Quality Analysis

To ensure high-quality datasets for AI training, V-Label performs an automated quality check **Client-side** before the image is even uploaded.

### Mechanism
The analysis is performed in the browser using the HTML5 Canvas API (`client/src/utils/image-analysis.ts`). This provides immediate feedback to the user without stressing the server.

The system evaluates three key metrics:

### A. Resolution Check
Ensures the image has sufficient detail.
*   **Logic**: Both `width` and `height` must be greater than or equal to the configured `minResolution`.
*   **Failure**: Flagged as "Low Resolution".

### B. Brightness Check
Ensures the image is not significantly overexposed (too white) or underexposed (too black).
*   **Algorithm**: 
    1.  The image is drawn onto a canvas and pixel data is retrieved.
    2.  For each pixel, **Luminance** is calculated using the standard Rec. 601 formula:
        $$L = 0.299 \times R + 0.587 \times G + 0.114 \times B$$
    3.  The **Average Luminance** (0-255) of the entire image is computed.
*   **Logic**:
    *   If `Average < minBrightness`: Flagged as "Too Dark".
    *   If `Average > maxBrightness`: Flagged as "Too Bright".

### C. Blur Detection
Identifies images that are out of focus using an edge detection method.
*   **Algorithm**: **Laplacian Variance** (Approximation).
    1.  The image is converted to grayscale.
    2.  A Laplacian convolution kernel is applied to detect edges:
        ```
        [ 0,  1,  0]
        [ 1, -4,  1]
        [ 0,  1,  0]
        ```
    3.  The **Variance** of the resulting response is calculated.
    4.  **Theory**: Focused images have sharp edges (high variance). Blurry images have smooth transitions (low variance).
*   **Logic**:
    *   If `Variance < blurThreshold`: Flagged as "Blurry".

---

## 3. Global Configuration

Administrators can configure the thresholds for Image Quality Analysis globally via the **Admin Panel** > **Image Quality**.

| Parameter | Description | Default |
| :--- | :--- | :--- |
| **Resolution Gate** | Minimum width/height required (pixels). | 100 |
| **Min Brightness** | Minimum average luminance (0-255). Lower is darker. | 25 |
| **Max Brightness** | Maximum average luminance (0-255). Higher is brighter. | 245 |
| **Blur Threshold** | Laplacian variance score. Higher requires sharper images. | 25 |

These settings are stored in the server's `SystemConfig` and are fetched by the client when the Upload Dialog is opened.
