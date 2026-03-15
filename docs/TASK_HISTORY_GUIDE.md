# Hướng dẫn Tích hợp Lịch sử Gán nhãn (Task History)

Tài liệu này tóm tắt các thay đổi ở Backend và các bước cần thiết để Frontend (FE) hiển thị lịch sử làm việc của một Task sau khi bị từ chối và gán lại cho người mới.

## 1. Thay đổi ở Backend

### Bảo toàn dữ liệu
- **Không còn xóa bản ghi**: Trước đây, khi một task bị Reject quá số lần quy định và chuyển cho người mới, các bản ghi cũ bị xóa khỏi database. Hiện tại, toàn bộ bản ghi cũ được giữ lại với trạng thái `REJECTED` hoặc `SKIPPED`.
- **Trạng thái mới**: Khi một task đang làm dở bị gán cho người khác, bản ghi cũ sẽ được chuyển sang trạng thái `SKIPPED`.

### Cấu trúc dữ liệu API mới
Các API chi tiết Task sau đây đã được bổ sung mảng `history` bên trong đối tượng `task`:
1. **Reviewer**: `GET /api/v1/reviewer/assignments/:id`
2. **Manager/Admin**: `GET /api/v1/projects/assignments/:id`

**Cấu trúc dữ liệu trả về:**
```json
{
  "id": "current-assignment-id",
  "status": "ASSIGNED",
  "task": {
    "id": "task-id",
    "history": [ // DANH SÁCH LỊCH SỬ (MỚI)
      {
        "id": "old-id",
        "status": "REJECTED",
        "reviewComment": "Lý do từ chối...",
        "annotations": [...], // Dữ liệu vẽ cũ
        "annotator": {
          "fullName": "Nguyễn Văn A",
          "email": "a@test.com"
        },
        "createdAt": "2024-03-15T..."
      }
    ],
    "image": { ... },
    "project": { ... }
  }
}
```

---

## 2. Công việc phía Frontend (FE)

### Đối với màn hình của Reviewer và Manager
- **Hiển thị danh sách**: Thêm một phần (ví dụ: Sidebar hoặc Tab "Lịch sử") để liệt kê các lần gán nhãn trước đó từ mảng `task.history`.
- **Xem lại dữ liệu cũ**: Khi người dùng nhấn vào một mục trong lịch sử, FE nên hiển thị các "box" (annotations) của bản ghi đó lên canvas (chế độ Read-only) để Reviewer có thể so sánh với bài làm hiện tại.
- **Hiển thị nhận xét**: Hiển thị trường `reviewComment` của các lần reject trước để Reviewer biết lý do tại sao task này bị chuyển người.

### Đối với màn hình của Annotator (Người làm)
- **Danh sách Task**: Đảm bảo task vẫn xuất hiện trong danh sách "My Tasks" của Annotator cũ với trạng thái `REJECTED` (hiện tại Backend đã trả về đủ, FE chỉ cần không lọc bỏ nó).
- **Chế độ Read-only**: Khi Annotator nhấn vào xem một task đã bị `REJECTED` (và đã được chuyển cho người khác), FE cần khóa các tính năng chỉnh sửa/submit, chỉ cho phép xem lại những gì mình đã làm và nhận xét của Reviewer.

### Logic xác định quyền chỉnh sửa
- Nếu `assignment.status` là `REJECTED` hoặc `SKIPPED` -> **Read-only**.
- Nếu `assignment.status` là `ASSIGNED` hoặc `IN_PROGRESS` -> **Chỉnh sửa bình thường**.
