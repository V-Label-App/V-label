# Backup Solutions nếu v6 vẫn không fix duplicate .env

## ✅ CÁCH 1: Tạo .env file trong Runner (KHUYẾN NGHỊ)

### Bước 1: Thêm step tạo .env vào workflow

Thêm step này TRƯỚC step "Build and Push Client Image":

```yaml
      - name: Create .env file for Docker build
        working-directory: ./client
        run: |
          cat > .env.docker <<EOF
          VITE_API_URL=${{ vars.VITE_API_URL }}
          VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN=${{ vars.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID=${{ vars.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET=${{ vars.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID=${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_FIREBASE_MEASUREMENT_ID=${{ secrets.VITE_FIREBASE_MEASUREMENT_ID }}
          EOF
          echo "✅ .env.docker created"
          cat .env.docker

      - name: Build and Push Client Image
        uses: docker/build-push-action@v6
        with:
          context: ./client
          file: ./client/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ steps.lower.outputs.owner }}/vlabel-client:latest
            ghcr.io/${{ steps.lower.outputs.owner }}/vlabel-client:${{ github.sha }}
          # XÓA TOÀN BỘ build-args block
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Bước 2: Sửa Dockerfile

Thay đổi trong `client/Dockerfile`:

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# QUAN TRỌNG: Copy .env.docker vào và rename thành .env
COPY .env.docker .env

# DEBUG: Print .env content
RUN echo "=== DEBUG: .env content ===" && cat .env && echo "=== END DEBUG ==="

# Build the application (Vite sẽ đọc .env file)
RUN npm run build

# Production stage
FROM nginx:alpine AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Bước 3: Update .dockerignore

Thêm vào `.dockerignore`:

```
.env.docker
!.env.docker
```

Dòng đầu ignore, dòng 2 un-ignore (cho phép COPY)

---

## ⚡ CÁCH 2: Dùng single-line build-args

Nếu multi-line bị lỗi, pass từng arg riêng:

```yaml
      - name: Build and Push Client Image
        uses: docker/build-push-action@v6
        with:
          context: ./client
          file: ./client/Dockerfile
          push: true
          tags: |
            ghcr.io/${{ steps.lower.outputs.owner }}/vlabel-client:latest
          build-args: VITE_API_URL=${{ vars.VITE_API_URL }},VITE_FIREBASE_API_KEY=${{ secrets.VITE_FIREBASE_API_KEY }},VITE_FIREBASE_AUTH_DOMAIN=${{ vars.VITE_FIREBASE_AUTH_DOMAIN }},VITE_FIREBASE_PROJECT_ID=${{ vars.VITE_FIREBASE_PROJECT_ID }},VITE_FIREBASE_STORAGE_BUCKET=${{ vars.VITE_FIREBASE_STORAGE_BUCKET }},VITE_FIREBASE_MESSAGING_SENDER_ID=${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }},VITE_FIREBASE_APP_ID=${{ secrets.VITE_FIREBASE_APP_ID }},VITE_FIREBASE_MEASUREMENT_ID=${{ secrets.VITE_FIREBASE_MEASUREMENT_ID }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

Note: Tất cả trên 1 dòng, cách nhau bằng dấu phẩy

---

## 🔧 CÁCH 3: Dùng docker CLI thay vì action

```yaml
      - name: Build and Push Client Image manually
        working-directory: ./client
        env:
          VITE_API_URL: ${{ vars.VITE_API_URL }}
          VITE_FIREBASE_API_KEY: ${{ secrets.VITE_FIREBASE_API_KEY }}
          VITE_FIREBASE_AUTH_DOMAIN: ${{ vars.VITE_FIREBASE_AUTH_DOMAIN }}
          VITE_FIREBASE_PROJECT_ID: ${{ vars.VITE_FIREBASE_PROJECT_ID }}
          VITE_FIREBASE_STORAGE_BUCKET: ${{ vars.VITE_FIREBASE_STORAGE_BUCKET }}
          VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.VITE_FIREBASE_MESSAGING_SENDER_ID }}
          VITE_FIREBASE_APP_ID: ${{ secrets.VITE_FIREBASE_APP_ID }}
          VITE_FIREBASE_MEASUREMENT_ID: ${{ secrets.VITE_FIREBASE_MEASUREMENT_ID }}
        run: |
          docker buildx build \
            --build-arg VITE_API_URL="$VITE_API_URL" \
            --build-arg VITE_FIREBASE_API_KEY="$VITE_FIREBASE_API_KEY" \
            --build-arg VITE_FIREBASE_AUTH_DOMAIN="$VITE_FIREBASE_AUTH_DOMAIN" \
            --build-arg VITE_FIREBASE_PROJECT_ID="$VITE_FIREBASE_PROJECT_ID" \
            --build-arg VITE_FIREBASE_STORAGE_BUCKET="$VITE_FIREBASE_STORAGE_BUCKET" \
            --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID="$VITE_FIREBASE_MESSAGING_SENDER_ID" \
            --build-arg VITE_FIREBASE_APP_ID="$VITE_FIREBASE_APP_ID" \
            --build-arg VITE_FIREBASE_MEASUREMENT_ID="$VITE_FIREBASE_MEASUREMENT_ID" \
            --tag ghcr.io/${{ steps.lower.outputs.owner }}/vlabel-client:latest \
            --tag ghcr.io/${{ steps.lower.outputs.owner }}/vlabel-client:${{ github.sha }} \
            --push \
            .
```

---

## 📊 So sánh

| Cách | Ưu điểm | Nhược điểm |
|------|---------|------------|
| **Cách 1: .env file** | ✅ Tránh hoàn toàn build-args issues<br>✅ Dễ debug (cat .env)<br>✅ Reliable nhất | ⚠️ Cần sửa cả workflow và Dockerfile |
| **Cách 2: Single-line** | ✅ Chỉ sửa workflow | ⚠️ Dòng dài khó đọc |
| **Cách 3: Docker CLI** | ✅ Full control | ⚠️ Mất cache optimization của action |

## 🎯 Khuyến nghị

**DÙNG CÁCH 1** nếu v6 vẫn không fix được - đây là cách ổn định và reliable nhất!
