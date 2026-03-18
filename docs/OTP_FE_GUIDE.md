# Hướng dẫn FE tích hợp OTP Login

Tài liệu này mô tả các thay đổi Backend liên quan đến tính năng **OTP Verification khi Login** và hướng dẫn Frontend cần làm gì để tích hợp.

---

## 1. Tổng quan tính năng

Khi Admin **bật OTP**, luồng login sẽ thay đổi từ **1 bước** thành **2 bước**:

```
[ OTP TẮT ]  Login → nhận accessToken ngay
[ OTP BẬT ]  Login → nhận otpToken → User nhập mã OTP từ email → verify → nhận accessToken
```

---

## 2. API mới / thay đổi

### 2.1. `GET /api/v1/config/otp` — Check OTP status (Public, không cần auth)

**Khi nào gọi:** Gọi trước khi hiển thị form login để biết OTP có bật không.

**Response:**
```json
{ "enabled": true }
```

> FE nên gọi API này khi mount trang Login để chuẩn bị UI cho luồng 2 bước nếu `enabled = true`.

---

### 2.2. `POST /api/v1/auth/login` — Login (ĐÃ THAY ĐỔI response)

**Request:** _(không đổi)_
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response khi OTP TẮT:** _(không đổi)_
```json
{
  "otpRequired": false,
  "accessToken": "eyJhbG...",
  "user": { "id": "...", "email": "...", "role": "ADMIN", "fullName": "..." }
}
```

**⚡ Response khi OTP BẬT:** _(MỚI)_
```json
{
  "otpRequired": true,
  "otpToken": "eyJhbG...dài...",
  "message": "OTP has been sent to your email"
}
```

> **Lưu ý:** Khi `otpRequired = true`, response **KHÔNG** chứa `accessToken` hay `user`. FE phải chuyển sang bước nhập OTP.

| Field | Type | Mô tả |
|-------|------|-------|
| `otpRequired` | `boolean` | **MỚI** — `true` = cần bước 2, `false` = login xong |
| `otpToken` | `string` | **MỚI** — Token tạm, dùng để verify OTP ở bước 2 |
| `message` | `string` | Thông báo OTP đã gửi |

---

### 2.3. `POST /api/v1/auth/verify-otp` — Verify OTP (API MỚI)

**Khi nào gọi:** Sau khi user nhập mã OTP 6 số từ email.

**Request:**
```json
{
  "otpToken": "eyJhbG...token từ bước login...",
  "code": "123456"
}
```

**Response thành công (200):**
```json
{
  "accessToken": "eyJhbG...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "ADMIN",
    "fullName": "Nguyen Van A",
    "avatarUrl": null
  }
}
```

**Response lỗi:**

| Status | Error | Nguyên nhân |
|--------|-------|-------------|
| 400 | `"otpToken and code are required"` | Thiếu field |
| 401 | `"Invalid OTP code."` | Mã OTP sai |
| 401 | `"OTP has expired. Please login again to get a new code."` | Hết hạn (mặc định 5 phút) |
| 401 | `"Invalid OTP token."` | Token không hợp lệ |

---

### 2.4. `GET /api/v1/admin/config/otp` — Admin xem OTP config (cần auth ADMIN)

**Headers:** `Authorization: Bearer <adminToken>`

**Response:**
```json
{
  "enabled": false,
  "expirationMinutes": 5
}
```

---

### 2.5. `PUT /api/v1/admin/config/otp` — Admin bật/tắt OTP (cần auth ADMIN)

**Headers:** `Authorization: Bearer <adminToken>`

**Request:**
```json
{
  "enabled": true,
  "expirationMinutes": 5
}
```

**Response:** Trả về config đã update.

---

## 3. Công việc FE cần làm

### 3.1. Cập nhật trang Login (BẮT BUỘC)

**Flow mới:**

```
┌─────────────┐    otpRequired=false    ┌──────────────┐
│  Form Login  │ ─────────────────────► │  Dashboard   │
│  email/pass  │                        │  (như cũ)     │
└──────┬───────┘                        └──────────────┘
       │ otpRequired=true
       ▼
┌─────────────┐    verify thành công    ┌──────────────┐
│  Form OTP   │ ─────────────────────► │  Dashboard   │
│  6-digit    │                        │              │
└─────────────┘                        └──────────────┘
```

**Chi tiết:**

1. Gọi `POST /api/v1/auth/login` với email/password
2. Check field `otpRequired` trong response:
   - **`false`** → Lưu `accessToken`, redirect vào app (giống cũ)
   - **`true`** → Lưu `otpToken` vào state, chuyển sang form nhập OTP
3. Hiển thị form nhập mã OTP 6 số:
   - Input 6 ô số (hoặc 1 input text)
   - Hiển thị thông báo: _"Mã OTP đã được gửi đến email của bạn"_
   - Nút "Xác nhận"
   - Link "Gửi lại mã" (gọi lại `POST /auth/login` để nhận OTP mới)
4. Khi user submit OTP → Gọi `POST /api/v1/auth/verify-otp` với `otpToken` + `code`
5. Nếu thành công → Lưu `accessToken` + `user`, redirect vào app
6. Nếu thất bại → Hiển thị lỗi tương ứng

**Pseudo-code:**
```typescript
const loginResponse = await api.post('/auth/login', { email, password });

if (loginResponse.data.otpRequired) {
  // Chuyển sang bước 2
  setOtpToken(loginResponse.data.otpToken);
  setShowOtpForm(true);
} else {
  // Login thành công, lưu token
  saveToken(loginResponse.data.accessToken);
  setUser(loginResponse.data.user);
  navigate('/dashboard');
}

// Khi user submit OTP code
const verifyResponse = await api.post('/auth/verify-otp', {
  otpToken,
  code: otpCode,
});
saveToken(verifyResponse.data.accessToken);
setUser(verifyResponse.data.user);
navigate('/dashboard');
```

### 3.2. Thêm trang Admin Config OTP (TÙY CHỌN nhưng NÊN LÀM)

Trong trang Admin Settings, thêm section quản lý OTP:

- Toggle bật/tắt OTP (`enabled`)
- Input thời gian hết hạn OTP (`expirationMinutes`)
- Gọi `GET /api/v1/admin/config/otp` để load config hiện tại
- Gọi `PUT /api/v1/admin/config/otp` để lưu thay đổi

### 3.3. Xử lý Edge Case (Optional nhưng khuyến khích)

| Case | Xử lý |
|------|--------|
| OTP hết hạn | Hiển thị lỗi + nút "Gửi lại mã" (gọi lại `/auth/login`) |
| Nhập sai OTP | Hiển thị lỗi _"Mã OTP không đúng"_, cho phép nhập lại |
| Nhập sai quá nhiều | Token vẫn valid cho đến khi hết hạn, không có rate limit hiện tại |
| User đóng tab rồi mở lại | `otpToken` mất → cần login lại từ đầu |

---

## 4. Tóm tắt Action Items cho FE

| # | Task | Độ ưu tiên |
|---|------|-----------|
| 1 | Cập nhật logic login: check `otpRequired` trong response | 🔴 Cao |
| 2 | Tạo UI form nhập OTP 6 số | 🔴 Cao |
| 3 | Gọi API `POST /auth/verify-otp` khi submit OTP | 🔴 Cao |
| 4 | Xử lý lỗi OTP (sai mã, hết hạn) | 🟡 Trung bình |
| 5 | Thêm nút "Gửi lại mã" | 🟡 Trung bình |
| 6 | Trang Admin config OTP (toggle + expiration) | 🟢 Thấp |
| 7 | Gọi `GET /config/otp` trước login để setup UI | 🟢 Thấp |
