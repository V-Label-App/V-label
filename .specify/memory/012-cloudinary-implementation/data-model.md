# Data Model: Cloudinary Implementation

## Entity Updates

### Image (Existing)
*Table: `images` (PostgreSQL)*

| Field | Type | Required | Description | Change |
|-------|------|----------|-------------|--------|
| `url` | String | Yes | Public/Secure URL of the image | **Use Existing**: `storageUrl` is the field name in Prisma schema |
| `publicId` | String | No | Cloudinary Public ID | **[NEW]** Store for management (delete/transform) |
| `format` | String | No | Image format (png, jpg) | **[NOT NEEDED]**: `format` exists in current schema |
| `width` | Int | No | Image width in pixels | **[NOT NEEDED]**: `width` already exists |
| `height` | Int | No | Image height in pixels | **[NOT NEEDED]**: `height` already exists |
| `bytes` | Int | No | File size in bytes | **Use Existing**: `fileSizeBytes` in Prisma schema |

### Config (Environment)
*File: `.env` / `src/config/env.ts`*

| Variable | Type | Description |
|----------|------|-------------|
| `CLOUDINARY_CLOUD_NAME` | String | Cloudinary Account Name |
| `CLOUDINARY_API_KEY` | String | API Key |
| `CLOUDINARY_API_SECRET` | String | API Secret |

## Schema Validation (Zod)

### Env Schema
```typescript
const envSchema = z.object({
  // ... existing vars
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
});
```

### Image Upload Response Schema
```typescript
const cloudinaryUploadResponseSchema = z.object({
  public_id: z.string(),
  secure_url: z.string().url(),
  format: z.string(),
  width: z.number(),
  height: z.number(),
  bytes: z.number(),
});
```
