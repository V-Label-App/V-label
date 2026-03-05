# Backend Changelog

---

## 📅 2026-03-05

### 1. Change Password API — `POST /api/v1/auth/change-password`

**Files changed:**
- `server/src/utils/validation.ts` — Thêm `changePasswordSchema`
- `server/src/services/auth.service.ts` — Thêm method `changePassword()`
- `server/src/controllers/auth.controller.ts` — Thêm handler `changePassword()`
- `server/src/routes/auth.routes.ts` — Thêm route `POST /change-password` (yêu cầu auth)

**Chi tiết:**
- Cho phép user đang đăng nhập (có Bearer token) tự đổi mật khẩu.
- Yêu cầu gửi `oldPassword` (xác minh chính chủ), `newPassword` (phải đáp ứng password policy: ≥8 ký tự, có uppercase, lowercase, số, ký tự đặc biệt), và `confirmNewPassword` (phải khớp với `newPassword`).
- Zod schema validate `confirmNewPassword === newPassword` ở tầng controller. Nếu không khớp → trả `400` ngay, không gọi xuống service. Nếu khớp → controller chỉ truyền `oldPassword` và `newPassword` xuống service.
- Không cho phép đổi password nếu tài khoản đăng nhập bằng Google (provider !== LOCAL).
- Response:
  - `200` — `{ success: true, message: "Password changed successfully" }`
  - `400` — `Current password is incorrect` / `Validation failed` / `Password change is not available for Google accounts`
  - `401` — `Unauthorized` (chưa đăng nhập)
  - `404` — `User not found`

**FE cần làm:**
- Tạo form **Đổi mật khẩu** (trong trang Profile hoặc Settings) với 3 field: `oldPassword`, `newPassword`, `confirmNewPassword`.
- Gửi `POST /api/v1/auth/change-password` với body `{ oldPassword, newPassword, confirmNewPassword }` kèm Bearer token.
- Xử lý các status code: 200 (thành công), 400 (sai mật khẩu cũ / validation / passwords không khớp), 401 (chưa login).

---

### 2. Admin sửa email user — `PUT /api/v1/users/:id`

**Files changed:**
- `server/src/utils/validation.ts` — Thêm field `email` vào `userUpdateSchema`
- `server/src/controllers/user.controller.ts` — Thêm logic check duplicate email

**Chi tiết:**
- `userUpdateSchema` giờ chấp nhận thêm field `email` (optional, validate format email).
- Controller kiểm tra email mới có bị trùng user khác không trước khi lưu.
- Nếu trùng → trả về `409 Conflict`:
  ```json
  { "error": "Email already in use by another user" }
  ```

**FE cần làm:**
- Thêm input field **Email** vào form Admin Edit User (trang quản lý user).
- Gửi `email` trong body `PUT /api/v1/users/:id` khi admin muốn sửa email.
- Xử lý thêm HTTP status `409` — hiển thị thông báo "Email đã được sử dụng bởi user khác".

---

### 3. Reset password validation — `POST /api/v1/auth/reset-password`

**Files changed:**
- `server/src/utils/validation.ts` — Thêm `resetPasswordSchema`
- `server/src/controllers/auth.controller.ts` — Dùng schema mới thay check `length < 3`

**Chi tiết:**
- Trước: chỉ check `newPassword.length < 3` → password `"abc"` vẫn pass.
- Sau: dùng `passwordSchema` yêu cầu:
  - Tối thiểu 8 ký tự
  - Ít nhất 1 chữ hoa
  - Ít nhất 1 chữ thường
  - Ít nhất 1 số
  - Ít nhất 1 ký tự đặc biệt (!@#$%^&*)
- Lỗi validation giờ trả format mới:
  ```json
  {
    "error": "Validation failed",
    "details": [
      { "field": "newPassword", "message": "Password must be at least 8 characters" }
    ]
  }
  ```

**FE cần làm:**
- Cập nhật trang **Reset Password** hiển thị yêu cầu mật khẩu mạnh (8 ký tự, hoa, thường, số, đặc biệt).
- Xử lý response lỗi mới: đọc `details[]` để hiển thị từng lỗi cụ thể thay vì chỉ `error` string.
- Thêm client-side validation tương tự để UX tốt hơn (không bắt buộc nhưng nên có).

---

### 3. updateProfile validation — `PUT /api/v1/users/me`

**Files changed:**
- `server/src/utils/validation.ts` — Thêm `updateProfileSchema`
- `server/src/controllers/user.controller.ts` — Validate body qua Zod

**Chi tiết:**
- Trước: lấy thẳng `req.body` không validate → có thể gửi `fullName` rỗng, `phoneNumber` bất kỳ.
- Sau: validate qua `updateProfileSchema`:
  - `fullName`: 2-50 ký tự, chỉ chữ cái và khoảng trắng (hỗ trợ tiếng Việt), optional.
  - `phoneNumber`: SĐT chuẩn Việt Nam (bắt đầu 03/05/07/08/09 hoặc 84), optional.
- Lỗi validation trả:
  ```json
  {
    "error": "Validation failed",
    "details": [
      { "field": "fullName", "message": "Full name must be at least 2 characters" }
    ]
  }
  ```

**FE cần làm:**
- **Không cần thay đổi gì** nếu FE đang gửi data đúng format. API chỉ thêm lớp bảo vệ backend.
- Nên xử lý thêm HTTP `400` response có `details[]` để hiển thị lỗi validation cụ thể (nếu chưa có).

---

### 4. forgotPassword validate email — `POST /api/v1/auth/forgot-password`

**Files changed:**
- `server/src/utils/validation.ts` — Thêm `forgotPasswordSchema`
- `server/src/controllers/auth.controller.ts` — Validate email qua Zod

**Chi tiết:**
- Trước: chỉ check `typeof email !== 'string'` → `"not-an-email"` vẫn pass.
- Sau: validate format email chuẩn qua Zod.

**FE cần làm:**
- **Không cần thay đổi gì**. FE đã có input `type="email"` và validate client-side. Backend chỉ thêm lớp bảo vệ.

---

### 5. getAllUsers thêm phân trang — `GET /api/v1/users`

**Files changed:**
- `server/src/controllers/user.controller.ts` — Thêm logic pagination

**Chi tiết:**
- Trước: trả toàn bộ users, không phân trang. Khi có nhiều user sẽ chậm.
- Sau: hỗ trợ query params `?page=1&limit=10` (optional).
- **Backward compatible** — nếu không gửi params, trả mảng users như cũ.
- Khi gửi params, response format mới:
  ```json
  {
    "data": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 85,
      "totalPages": 9
    }
  }
  ```

**FE cần làm:**
- **Không cần sửa ngay** — API vẫn hoạt động như cũ nếu không gửi `page`/`limit`.
- Khi muốn tối ưu: gửi `?page=1&limit=10`, đọc `data` thay vì response trực tiếp, và dùng `pagination` object để hiển thị pagination UI.

---

## Tổng hợp FE action items

| API | FE cần sửa? | Mức độ |
|-----|-------------|--------|
| `PUT /api/v1/users/:id` (Admin edit email) | ✅ Có | Thêm input email + handle 409 |
| `POST /api/v1/auth/reset-password` | ✅ Có | Cập nhật yêu cầu password + handle error format mới |
| `PUT /api/v1/users/me` (Update profile) | ⚠️ Khuyến nghị | Handle error `details[]` nếu chưa có |
| `POST /api/v1/auth/forgot-password` | ❌ Không | Không ảnh hưởng |
| `GET /api/v1/users` (Pagination) | ⚠️ Khuyến nghị | Gửi `?page=&limit=` + hiển thị pagination UI |
