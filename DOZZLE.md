# 📊 Dozzle - Docker Logs Monitoring

## ✅ Đã cài đặt xong!

Dozzle giờ đã được tích hợp vào V-Label stack để xem real-time logs của tất cả Docker containers.

---

## 🚀 Cách sử dụng

### **1. Truy cập Dozzle UI**
Sau khi deploy xong, mở trình duyệt:

```
https://vlabel.cloud/logs
```

### **2. Tính năng chính**

✅ **Real-time logs** - Xem logs live từ tất cả containers  
✅ **Multi-container view** - Xem nhiều container cùng lúc  
✅ **Search & Filter** - Tìm kiếm trong logs  
✅ **Auto-scroll** - Tự động scroll theo logs mới  
✅ **Dark mode** - Giao diện tối dễ nhìn  
✅ **No VPS access needed** - Không cần SSH vào server

---

## 🔒 Bảo mật (Tùy chọn)

Hiện tại `/logs` **chưa có authentication**. Để thêm bảo mật:

### **Option 1: Basic Authentication**

1. Tạo file password trên VPS:
```bash
# SSH vào VPS
ssh root@vlabel.cloud

# Tạo htpasswd file
sudo apt-get install apache2-utils
htpasswd -c /etc/nginx/.htpasswd admin
# Nhập password khi được hỏi
```

2. Uncomment 2 dòng trong `nginx/nginx.conf`:
```nginx
location /logs {
    auth_basic "Restricted Access";              # ← Bỏ comment
    auth_basic_user_file /etc/nginx/.htpasswd;   # ← Bỏ comment
    ...
}
```

3. Restart Nginx:
```bash
docker compose -f docker-compose.prod.yml restart nginx
```

### **Option 2: IP Whitelist**

Chỉ cho phép IP cụ thể truy cập:

```nginx
location /logs {
    allow 123.45.67.89;  # IP của bạn
    deny all;
    ...
}
```

---

## 📱 Tích hợp vào Admin Dashboard

Bạn có thể thêm link vào Admin panel:

```tsx
// client/src/features/admin/pages/AdminDashboard.tsx

<Button 
  onClick={() => window.open('https://vlabel.cloud/logs', '_blank')}
>
  📊 View Server Logs
</Button>
```

Hoặc embed trực tiếp bằng iframe:

```tsx
<iframe 
  src="https://vlabel.cloud/logs" 
  width="100%" 
  height="600px"
  style={{ border: 'none' }}
/>
```

---

## 🎯 Containers được monitor

Dozzle tự động detect và hiển thị logs của:

- ✅ `vlabel-postgres` - Database logs
- ✅ `vlabel-server` - Backend API logs
- ✅ `vlabel-client` - Frontend logs
- ✅ `vlabel-nginx` - Nginx access/error logs
- ✅ `vlabel-dozzle` - Dozzle chính nó

---

## 🔧 Cấu hình nâng cao

Các biến môi trường trong `docker-compose.prod.yml`:

```yaml
environment:
  - DOZZLE_LEVEL=info           # Log level: debug, info, warn, error
  - DOZZLE_TAILSIZE=300         # Số dòng log hiển thị ban đầu
  - DOZZLE_FILTER=name=vlabel-* # Chỉ hiện containers có tên bắt đầu với vlabel-
  - DOZZLE_NO_ANALYTICS=true    # Tắt analytics
```

Xem thêm: https://dozzle.dev/guide/configuration

---

## 🐛 Troubleshooting

### **Không thấy logs?**
```bash
# Kiểm tra Dozzle container đang chạy
docker ps | grep dozzle

# Xem logs của Dozzle
docker logs vlabel-dozzle
```

### **403 Forbidden?**
- Kiểm tra Nginx config đã reload chưa
- Xem logs: `docker logs vlabel-nginx`

### **WebSocket error?**
- Dozzle cần WebSocket để real-time update
- Đảm bảo Nginx config đã có `proxy_set_header Upgrade`

---

## 📚 Tài liệu

- Official docs: https://dozzle.dev
- GitHub: https://github.com/amir20/dozzle
