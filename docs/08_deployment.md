# V-Label Deployment Guide

Hướng dẫn deploy V-Label lên VPS Ubuntu sử dụng Docker Compose và GitHub Actions CI/CD.

## Mục lục

1. [Yêu cầu hệ thống](#1-yêu-cầu-hệ-thống)
2. [Chuẩn bị VPS](#2-chuẩn-bị-vps)
3. [Cài đặt Docker](#3-cài-đặt-docker)
4. [Cấu hình ứng dụng](#4-cấu-hình-ứng-dụng)
5. [Deploy thủ công](#5-deploy-thủ-công)
6. [Setup CI/CD với GitHub Actions](#6-setup-cicd-với-github-actions)
7. [Cấu hình SSL với Let's Encrypt](#7-cấu-hình-ssl-với-lets-encrypt)
8. [Backup và Restore](#8-backup-và-restore)
9. [Monitoring và Logs](#9-monitoring-và-logs)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Yêu cầu hệ thống

### VPS Specifications

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 1 vCPU | 2+ vCPU |
| RAM | 2 GB | 4+ GB |
| Storage | 20 GB SSD | 40+ GB SSD |
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### Ports cần mở

| Port | Service | Description |
|------|---------|-------------|
| 22 | SSH | Remote access |
| 80 | HTTP | Web traffic (redirect to HTTPS) |
| 443 | HTTPS | Secure web traffic |

---

## 2. Chuẩn bị VPS

### 2.1. Kết nối SSH đến VPS

```bash
ssh root@your-vps-ip
```

### 2.2. Update hệ thống

```bash
apt update && apt upgrade -y
```

### 2.3. Tạo user deploy (khuyến nghị)

```bash
# Tạo user
adduser deploy

# Thêm vào sudo group
usermod -aG sudo deploy

# Chuyển sang user deploy
su - deploy
```

### 2.4. Cấu hình SSH key (optional nhưng khuyến nghị)

Trên máy local:

```bash
# Generate SSH key nếu chưa có
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy public key lên VPS
ssh-copy-id deploy@your-vps-ip
```

### 2.5. Cấu hình Firewall

```bash
# Cài đặt UFW
sudo apt install ufw -y

# Cấu hình rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https

# Bật firewall
sudo ufw enable

# Kiểm tra status
sudo ufw status
```

---

## 3. Cài đặt Docker

### 3.1. Cài đặt Docker Engine

```bash
# Cài đặt dependencies
sudo apt install apt-transport-https ca-certificates curl software-properties-common -y

# Thêm Docker GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Thêm Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài đặt Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y

# Thêm user vào docker group
sudo usermod -aG docker $USER

# Apply group changes (hoặc logout/login lại)
newgrp docker

# Kiểm tra Docker
docker --version
docker compose version
```

### 3.2. Cấu hình Docker (optional)

```bash
# Tạo daemon.json cho logging
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

# Restart Docker
sudo systemctl restart docker
```

---

## 4. Cấu hình ứng dụng

### 4.1. Tạo thư mục project

```bash
sudo mkdir -p /opt/vlabel
sudo chown $USER:$USER /opt/vlabel
cd /opt/vlabel
```

### 4.2. Clone repository

```bash
git clone https://github.com/your-username/V-label-app.git .
```

### 4.3. Tạo file environment

```bash
# Copy example và chỉnh sửa
cp .env.production.example .env.production

# Chỉnh sửa với các giá trị thực
nano .env.production
```

**Lưu ý quan trọng về environment variables:**

```bash
# .env.production
# ===========================================
# Database - Sử dụng password mạnh!
# ===========================================
DB_USER=vlabel_user
DB_PASSWORD=SuperSecurePassword123!@#
DB_NAME=vlabel_db

# ===========================================
# JWT Secret - Generate bằng:
# openssl rand -base64 64
# ===========================================
JWT_SECRET=your-generated-jwt-secret

# ===========================================
# Production API URL - Domain của bạn
# ===========================================
VITE_API_URL=https://your-domain.com/api/v1

# ... các biến Firebase khác
```

### 4.4. Tạo thư mục cần thiết

```bash
mkdir -p nginx/ssl certbot/www certbot/conf
```

---

## 5. Deploy thủ công

### 5.1. Build và chạy containers

```bash
cd /opt/vlabel

# Load environment variables
export $(cat .env.production | xargs)

# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Kiểm tra status
docker compose -f docker-compose.prod.yml ps
```

### 5.2. Chạy database migrations

```bash
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy
```

### 5.3. Seed database (optional - chỉ lần đầu)

```bash
docker compose -f docker-compose.prod.yml exec server npx prisma db seed
```

### 5.4. Kiểm tra logs

```bash
# Tất cả services
docker compose -f docker-compose.prod.yml logs -f

# Chỉ server
docker compose -f docker-compose.prod.yml logs -f server

# Chỉ client
docker compose -f docker-compose.prod.yml logs -f client
```

### 5.5. Commands hữu ích

```bash
# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Rebuild và restart một service
docker compose -f docker-compose.prod.yml up -d --build server

# Vào shell của container
docker compose -f docker-compose.prod.yml exec server sh
```

---

## 6. Setup CI/CD với GitHub Actions

### 6.1. Cấu hình GitHub Secrets

Vào GitHub repository > Settings > Secrets and variables > Actions, thêm các secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | IP hoặc domain của VPS | `192.168.1.1` |
| `VPS_USERNAME` | Username SSH | `deploy` |
| `VPS_SSH_KEY` | Private SSH key | Nội dung file `~/.ssh/id_ed25519` |
| `VPS_PORT` | SSH port (optional) | `22` |
| `VITE_API_URL` | Production API URL | `https://your-domain.com/api/v1` |
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `your-project-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID | `1:123:web:abc` |
| `VITE_FIREBASE_MEASUREMENT_ID` | Firebase measurement ID | `G-XXXXXXX` |

### 6.2. Cấu hình SSH key cho GitHub Actions

```bash
# Trên máy local, generate key riêng cho deploy
ssh-keygen -t ed25519 -f ~/.ssh/vlabel_deploy -C "github-actions-deploy"

# Copy public key lên VPS
ssh-copy-id -i ~/.ssh/vlabel_deploy.pub deploy@your-vps-ip

# Copy nội dung private key để paste vào GitHub Secret VPS_SSH_KEY
cat ~/.ssh/vlabel_deploy
```

### 6.3. Chuẩn bị VPS cho auto-deploy

```bash
# Trên VPS, tạo docker-compose.prod.yml nếu chưa có
cd /opt/vlabel

# Tạo .env.production với các giá trị thực
# (các biến sẽ được đọc bởi docker-compose)
```

### 6.4. Workflow hoạt động

Workflow `deploy.yml` sẽ:
1. **Build & Push**: Build Docker images và push lên GitHub Container Registry
2. **Deploy**: SSH vào VPS, pull images mới, chạy migrations, restart services

Trigger tự động khi:
- Push code lên branch `main`
- Chạy thủ công qua Actions tab

---

## 7. Cấu hình SSL với Let's Encrypt

### 7.1. Trỏ domain về VPS

Tại nhà cung cấp domain, tạo A record:
- `your-domain.com` → `VPS_IP`
- `www.your-domain.com` → `VPS_IP`

### 7.2. Cấu hình Nginx cho SSL

Chỉnh sửa `nginx/nginx.conf`:

```nginx
# Uncomment server block cho HTTP redirect
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# Uncomment và cấu hình HTTPS server block
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... rest of config
}
```

### 7.3. Lấy SSL certificate

```bash
# Chạy certbot (lần đầu)
docker compose -f docker-compose.prod.yml run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d your-domain.com \
  -d www.your-domain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# Restart nginx để apply SSL
docker compose -f docker-compose.prod.yml restart nginx
```

### 7.4. Auto-renew SSL

Certbot container đã được cấu hình để tự động renew. Kiểm tra:

```bash
# Test renewal
docker compose -f docker-compose.prod.yml run --rm certbot renew --dry-run
```

---

## 8. Backup và Restore

### 8.1. Backup Database

```bash
# Tạo thư mục backup
mkdir -p /opt/vlabel/backups

# Script backup (lưu vào backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/vlabel/backups

docker compose -f /opt/vlabel/docker-compose.prod.yml exec -T postgres \
  pg_dump -U vlabel_user vlabel_db | gzip > $BACKUP_DIR/vlabel_$DATE.sql.gz

# Xóa backup cũ hơn 7 ngày
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: vlabel_$DATE.sql.gz"
```

```bash
# Làm cho script executable
chmod +x backup.sh

# Chạy backup
./backup.sh
```

### 8.2. Cấu hình Cron job cho auto backup

```bash
# Mở crontab
crontab -e

# Thêm dòng sau để backup hàng ngày lúc 3:00 AM
0 3 * * * /opt/vlabel/backup.sh >> /var/log/vlabel-backup.log 2>&1
```

### 8.3. Restore Database

```bash
# Restore từ backup
gunzip < /opt/vlabel/backups/vlabel_20240115_030000.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U vlabel_user vlabel_db
```

---

## 9. Monitoring và Logs

### 9.1. Xem logs

```bash
# Real-time logs của tất cả services
docker compose -f docker-compose.prod.yml logs -f

# Logs của service cụ thể
docker compose -f docker-compose.prod.yml logs -f server
docker compose -f docker-compose.prod.yml logs -f client
docker compose -f docker-compose.prod.yml logs -f nginx
docker compose -f docker-compose.prod.yml logs -f postgres

# Logs với số dòng giới hạn
docker compose -f docker-compose.prod.yml logs --tail=100 server
```

### 9.2. Kiểm tra resource usage

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

### 9.3. Health checks

```bash
# Kiểm tra health của containers
docker compose -f docker-compose.prod.yml ps

# Kiểm tra API health
curl http://localhost/api/v1/health
```

---

## 10. Troubleshooting

### 10.1. Container không start được

```bash
# Xem logs chi tiết
docker compose -f docker-compose.prod.yml logs server

# Kiểm tra config
docker compose -f docker-compose.prod.yml config

# Rebuild image
docker compose -f docker-compose.prod.yml build --no-cache server
```

### 10.2. Database connection failed

```bash
# Kiểm tra postgres đang chạy
docker compose -f docker-compose.prod.yml ps postgres

# Kiểm tra logs postgres
docker compose -f docker-compose.prod.yml logs postgres

# Test connection
docker compose -f docker-compose.prod.yml exec postgres psql -U vlabel_user -d vlabel_db
```

### 10.3. Nginx 502 Bad Gateway

```bash
# Kiểm tra backend đang chạy
docker compose -f docker-compose.prod.yml ps server

# Kiểm tra nginx config
docker compose -f docker-compose.prod.yml exec nginx nginx -t

# Reload nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### 10.4. Out of disk space

```bash
# Xem disk usage
df -h

# Clean Docker
docker system prune -a --volumes

# Xóa logs cũ
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log
```

### 10.5. SSL certificate issues

```bash
# Kiểm tra certificate
docker compose -f docker-compose.prod.yml exec nginx \
  openssl x509 -in /etc/letsencrypt/live/your-domain.com/fullchain.pem -text -noout

# Force renew
docker compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
```

---

## Cấu trúc files deployment

```
V-label-app/
├── client/
│   ├── Dockerfile          # Frontend Docker build
│   └── nginx.conf          # Client nginx config
├── server/
│   ├── Dockerfile          # Backend Docker build
│   └── docker-compose.yml  # Dev database only
├── nginx/
│   └── nginx.conf          # Production reverse proxy
├── certbot/
│   ├── www/                # ACME challenge files
│   └── conf/               # SSL certificates
├── .github/
│   └── workflows/
│       ├── ci.yml          # Build check workflow
│       └── deploy.yml      # Auto deployment workflow
├── docker-compose.prod.yml # Production orchestration
├── .env.production.example # Environment template
└── docs/
    └── 08_deployment.md    # This file
```

---

## Quick Reference Commands

```bash
# Start all services
docker compose -f docker-compose.prod.yml up -d

# Stop all services
docker compose -f docker-compose.prod.yml down

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart specific service
docker compose -f docker-compose.prod.yml restart server

# Run migrations
docker compose -f docker-compose.prod.yml exec server npx prisma migrate deploy

# Backup database
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U vlabel_user vlabel_db > backup.sql

# Update & redeploy
git pull && docker compose -f docker-compose.prod.yml up -d --build
```
