# Quickstart: Cloudinary Implementation

## Prerequisites

1.  **Cloudinary Account**: You need a Cloudinary account.
2.  **API Credentials**: Get `Cloud Name`, `API Key`, and `API Secret` from your Cloudinary Dashboard.

## Setup

1.  **Environment Variables**:
    Add the following to your `server/.env` file:
    ```bash
    CLOUDINARY_CLOUD_NAME=your_cloud_name
    CLOUDINARY_API_KEY=your_api_key
    CLOUDINARY_API_SECRET=your_api_secret
    ```

2.  **Install Dependencies**:
    ```bash
    cd server
    npm install cloudinary
    ```

3.  **Run Migrations**:
    ```bash
    cd server
    npx prisma migrate dev --name add_cloudinary_fields
    ```

## Usage

### Uploading Images
Images uploaded via the `POST /api/v1/projects/:id/images` endpoint will now automatically be stored in Cloudinary. The response will include the Cloudinary URL.
