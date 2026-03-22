# Tài Liệu Hướng Dẫn Frontend: Tính Năng Đổi Quản Lý Dự Án (Reassign Manager)

Tài liệu này tổng hợp lại các thay đổi bên phía Backend và hướng dẫn cách Frontend tích hợp API mới cho luồng nghiệp vụ "Admin đổi Manager của một Project".

---

## 1. Tóm tắt Backend đã thay đổi những gì?

- **Quyền Truy Cập Project (ProjectMember)**: Khi đổi Manager, danh tính cũ của Manager sẽ bị **xóa hoàn toàn** khỏi `ProjectMember`, đồng thời Manager mới sẽ được gán quyền `MANAGER`.
    - 👉 *Kết quả UI*: Manager cũ sẽ **không còn nhìn thấy** project đó trên Dashboard của họ.
- **Dữ liệu lịch sử (History Validation)**: Mọi thao tác assignment / activities mà Manager cũ đã làm trước đây (TaskActivity, TaskAssignment) vẫn được **giữ nguyên vẹn** và gắn định danh người đó. Không có gì biến mất.
- **Real-time Notifications**: Backend đã cài đặt tự động bắn Notification websocket thông báo cho:
    - **Manager Cũ**: Loại thông báo `PROJECT_UNASSIGNED` ("Bạn không còn là quản lý dự án...").
    - **Manager Mới**: Loại thông báo `PROJECT_ASSIGNED` ("Bạn vừa được phân công làm quản lý...").
- **Audit Logging**: Hành động thay đổi của Admin cũng đã được tự động lưu vết vào `AuditLog`.

---

## 2. Thông Tin Endpoint Mới (Dành Cho Fetch API)

Thay vì gọi các api lẻ tẻ để thêm/xóa thành viên. Frontend chỉ cần gọi đúng **01 Endpoint** duy nhất chuyên phục vụ cho thay đổi quyền Manager này.

### `PUT /api/v1/projects/:id/reassign-manager`

Endpoint này được gọi khi Admin xác nhận lưu Manager mới cho Project.

- **Authorization**: Yêu cầu Token của user có role **`ADMIN`**. (Chỉ Admin mới có quyền gọi).
- **Tham số URL (`:id`)**: ID của Project cần thay đổi.

**Body (JSON)**:
```json
{
  "newManagerId": "uuid-cua-nguoi-manager-moi",
  "reason": "Lý do thay đổi (ví dụ: Manager cũ nghỉ phép)" // Trường reason là optional (có thể không truyền)
}
```

**Response Thành Công (200 OK)**:
Trả về thông tin Member của Manager mới vừa được setup.
```json
{
  "id": "uuid-cua-project-member",
  "projectId": "uuid-project",
  "userId": "uuid-new-manager",
  "projectRole": "MANAGER",
  "joinedAt": "2026-03-22T00:00:00.000Z",
  "project": {
    "name": "Tên Project"
  }
}
```

**Các Mã Lỗi Có Thể Trả Về (Cần Handle Frontend)**:
- `401 / 403`: Không có quyền gọi API (Gọi bằng tk không phải Admin).
- `400 Validation failed`: Thiếu field `newManagerId` hoặc ID không đúng định dạng UUID.
- `404`: Không tìm thấy Project.
- `409`: Trùng lặp (User có `newManagerId` hiện tại đang làm Manager của project này rồi).

---

## 3. Hướng dẫn UI/UX Cho Đội Frontend

1. **Dashboard Admin (Quản lý Project)**:
   - Tại màn hình danh sách các chiến dịch / dự án, với mỗi Item Project, thêm một tùy chọn "Đổi Manager" (Reassign Manager) ở menu Dropdown/Action.
   - Bấm vào sẽ mở ra 1 cái **Modal chọn Manager**.
   - Sau khi bấm "Xác nhận", Frontend gọi API `PUT /api/v1/projects/:id/reassign-manager` kèm loading state.
   - Gọi API thành công báo Toast Message báo đổi Manager thành công. Xin lưu ý reload lại danh sách hoặc cập nhật UI field Manager.

2. **Giao diện chuông Thông báo (Notifications)**: 
   - Đảm bảo Socket IO client đã parse đúng 2 loại enum event mới từ WebSocket message (`PROJECT_ASSIGNED` và `PROJECT_UNASSIGNED`). Giao diện sẽ tự động pop-up thông báo mà không cần tích hợp gì thêm ở API nhận do BackEnd đã cover format mặc định.

3. **Giao diện Lịch sử / Overview Tab (Trong chi tiết Project)**:
   - Các Lịch sử Assign hay duyệt ảnh cũ vẫn hiển thị Component avatar/tên của Manager cũ (Do dữ liệu BackEnd bảo toàn lịch sử đứng tên người cũ). Frontend KHÔNG cần làm thêm logic giấu lịch sử nào cả. Mọi thông tin tuân theo API như cũ.

Chúc các bạn tích hợp thành công! Mọi thay đổi logic sâu hơn xin vui lòng thảo luận.
