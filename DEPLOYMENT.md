# 🚀 **HƯỚNG DẪN DEPLOY V-LABEL LÊN VPS**

## 📋 **Mục Lục**
1. [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
2. [Chuẩn Bị VPS](#chuẩn-bị-vps)
3. [Cấu Hình Environment](#cấu-hình-environment)
4. [Deploy với Docker Compose](#deploy-với-docker-compose)
5. [Cấu Hình SSL/HTTPS](#cấu-hình-sslhttps)
6. [Monitoring & Troubleshooting](#monitoring--troubleshooting)

---

## 🖥️ **Yêu Cầu Hệ Thống**

### VPS Minimum Requirements:
- **RAM**: 2GB (khuyến nghị 4GB)
- **CPU**: 2 cores
- **Disk**: 20GB SSD
- **OS**: Ubuntu 20.04/22.04 LTS hoặc Debian 11+
- **Bandwidth**: 100Mbps

### Software Requirements:
- Docker Engine 24.0+
- Docker Compose V2
- Git
- Domain name (cho SSL)

---

## 🔧 **Chuẩn Bị VPS**

### 1. SSH vào VPS

```bash
ssh root@your-vps-ip
```

### 2. Update hệ thống

```bash
apt update && apt upgrade -y
```

### 3. Cài đặt Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose V2
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 4. Cài đặt Git

```bash
apt install git -y
```

### 5. Tạo user non-root (khuyến nghị)

```bash
adduser deployer
usermod -aG docker deployer
usermod -aG sudo deployer

# Switch to deployer user
su - deployer
```

---

## ⚙️ **Cấu Hình Environment**

### 1. Clone Repository

```bash
cd ~
git clone https://github.com/your-username/V-label_app.git
cd V-label_app
```

### 2. Tạo file `.env.production`

```bash
cp .env.production.example .env.production
nano .env.production
```

### 3. Điền thông tin vào `.env.production`

#### **Database Configuration**
```env
DB_USER=vlabel_user
DB_PASSWORD=your_super_secure_password_123!
DB_NAME=vlabel_production
```

#### **Server Configuration**
```env
NODE_ENV=production
PORT=4000
LOG_LEVEL=info

# Generate JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
```

#### **Firebase Configuration**
Lấy từ Firebase Console > Project Settings > Service Accounts

```env
FIREBASE_PROJECT_ID=your-firebase-project
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
```

#### **Frontend URLs**
```env
# Domain của bạn
VITE_API_URL=https://yourdomain.com/api

# Firebase Client Config
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

#### **Domain Configuration**
```env
DOMAIN=yourdomain.com
EMAIL=your-email@example.com
```

### 4. Tạo thư mục cho Nginx config

```bash
mkdir -p nginx/ssl certbot/www certbot/conf
```

### 5. Tạo Nginx Configuration

```bash
nano nginx/nginx.conf
```

Nội dung file:
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    upstream backend {
        server server:4000;
    }

    upstream frontend {
        server client:80;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        
        # Let's Encrypt challenge
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    # HTTPS Server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

        # SSL Configuration
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_prefer_server_ciphers off;
        ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';

        # Security Headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }

        # Backend API
        location /api {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # WebSocket support
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
        }

        # Increase upload size limit
        client_max_body_size 50M;
    }
}
```

---

## 🐳 **Deploy với Docker Compose**

### 1. Build và Start Services

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Build and start all services
docker compose -f docker-compose.prod.yml up -d --build
```

### 2. Check logs

```bash
# Check all services
docker compose -f docker-compose.prod.yml logs -f

# Check specific service
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f postgres
```

### 3. Run Database Migrations

```bash
# Access server container
docker compose -f docker-compose.prod.yml exec server sh

# Run migrations
npx prisma migrate deploy

# Seed database (optional)
npm run seed

# Exit container
exit
```

### 4. Verify Services

```bash
# Check all containers status
docker compose -f docker-compose.prod.yml ps

# Test backend health
curl http://localhost:4000/api/v1/health

# Check database connection
docker compose -f docker-compose.prod.yml exec postgres psql -U vlabel_user -d vlabel_production -c '\dt'
```

---

## 🔒 **Cấu Hình SSL/HTTPS**

### Option 1: Let's Encrypt (Free, Auto-renew)

#### 1. First-time SSL setup

```bash
# Chạy certbot để lấy certificate lần đầu
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com \
  -d www.yourdomain.com
```

#### 2. Restart Nginx với SSL

```bash
docker compose -f docker-compose.prod.yml restart nginx
```

#### 3. Auto-renewal (đã có trong docker-compose)

Certbot container sẽ tự động renew certificate mỗi 12 giờ.

### Option 2: Custom SSL Certificate

Nếu bạn có certificate riêng:

```bash
# Copy certificate files
cp your-cert.crt nginx/ssl/fullchain.pem
cp your-key.key nginx/ssl/privkey.pem

# Update nginx.conf to point to /etc/nginx/ssl/
```

---

## 📊 **Monitoring & Troubleshooting**

### Common Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart a service
docker compose -f docker-compose.prod.yml restart server

# Stop all services
docker compose -f docker-compose.prod.yml down

# Stop and remove volumes (⚠️ DATA LOSS)
docker compose -f docker-compose.prod.yml down -v

# Rebuild specific service
docker compose -f docker-compose.prod.yml up -d --build server

# Check resource usage
docker stats
```

### Database Backup

```bash
# Create backup
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U vlabel_user vlabel_production > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
cat backup_file.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U vlabel_user vlabel_production
```

### Performance Monitoring

```bash
# See container resource usage
docker stats vlabel-server vlabel-postgres vlabel-nginx

# Check disk usage
docker system df
```

### Troubleshooting Common Issues

#### 1. **Container keeps restarting**
```bash
# Check logs
docker logs vlabel-server --tail 100

# Check health status
docker compose -f docker-compose.prod.yml ps
```

#### 2. **Database connection error**
```bash
# Verify postgres is healthy
docker compose -f docker-compose.prod.yml exec postgres pg_isready -U vlabel_user

# Check DATABASE_URL in server container
docker compose -f docker-compose.prod.yml exec server env | grep DATABASE_URL
```

#### 3. **Nginx 502 Bad Gateway**
```bash
# Check if backend is running
docker compose -f docker-compose.prod.yml ps server

# Test backend directly
curl http://localhost:4000/api/v1/health

# Check nginx config
docker compose -f docker-compose.prod.yml exec nginx nginx -t
```

---

## 🚀 **Quick Start Script**

Tạo file `deploy.sh` để tự động hóa:

```bash
#!/bin/bash

echo "🚀 Starting V-Label Deployment..."

# Load environment
export $(cat .env.production | xargs)

# Build and start
docker compose -f docker-compose.prod.yml up -d --build

# Wait for postgres
echo "⏳ Waiting for database..."
sleep 10

# Run migrations
echo "📦 Running database migrations..."
docker compose -f docker-compose.prod.yml exec -T server npx prisma migrate deploy

echo "✅ Deployment complete!"
echo "🌐 Visit: https://$DOMAIN"
```

Chạy:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 📝 **Checklist Before Deploy**

- [ ] Domain đã trỏ về IP VPS
- [ ] `.env.production` đã điền đầy đủ
- [ ] Firebase credentials đã thiết lập
- [ ] Nginx config đã update domain
- [ ] SSL certificate đã setup (hoặc sẽ dùng Let's Encrypt)
- [ ] Database password đủ mạnh
- [ ] JWT_SECRET đã generate random

---

## 🎯 **Next Steps**

1. **Monitoring**: Setup monitoring tools (Grafana, Prometheus)
2. **Backups**: Thiết lập automated backups cho database
3. **CI/CD**: Setup GitHub Actions để auto-deploy
4. **Scaling**: Nếu traffic tăng, cân nhắc load balancer

---

Có câu hỏi gì cứ hỏi! 🚀
