# Hướng dẫn Tích hợp Lịch sử Gán nhãn - Bổ sung

Tài liệu này tóm tắt các thay đổi ở Backend để xử lý lỗi mất lịch sử/comment cũ khi reject task nhiều lần, đồng thời hướng dẫn chi tiết những gì Frontend (FE) cần làm để tích hợp tính năng này.

---

## 1. Các thay đổi đã thực hiện ở Backend

### 1.1. Cập nhật Database Schema
- **Bảng mới `TaskSubmissionHistory`**: Được thêm vào để lưu trữ các "snapshot" của mỗi lần submit/reject. Bảng này lưu lại `annotations`, `reviewComment`, trạng thái, số thứ tự nộp và thời gian.
- **Liên kết**: Mỗi `TaskAssignment` giờ đây có một mảng `submissionHistory` chứa các bản ghi lịch sử này.

### 1.2. Cập nhật Logic Service
- **Lưu lịch sử khi Reject**: Khi Reviewer thực hiện reject task (`ReviewerService.rejectTask`), Backend sẽ tự động sinh thêm 1 bản ghi vào bảng `TaskSubmissionHistory` để snapshot dữ liệu (`annotations` và `reviewComment` của lần reject đó) trước khi cập nhật bảng chính.
- **Cập nhật API trả về**: API lấy chi tiết task cho cả Reviewer (`GET /api/v1/reviewer/assignments/:id`) và Annotator (`GET /api/v1/annotator/tasks/:id`) đã được cập nhật để bao gồm field mới `submissionHistory` (được sắp xếp theo `submissionNumber` giảm dần - mới nhất xếp đầu).

### 1.3. Cấu trúc dữ liệu API trả về (Mảng `submissionHistory`)
```json
{
  "id": "assignment-id",
  "status": "REJECTED",
  "reviewComment": "Comment của lần reject hiện tại",
  "annotations": [...], // Annotations hiện tại
  "submissionHistory": [
    {
      "submissionNumber": 2, // Lần submit thứ 2
      "reviewComment": "Lý do reject lần 2...",
      "annotations": [...], // Snapshot annotations lúc nộp lần 2
      "status": "REJECTED",
      "submittedAt": "2024-03-16T10:00:00Z",
      "reviewedAt": "2024-03-16T10:30:00Z"
    },
    {
      "submissionNumber": 1, 
      "reviewComment": "Lý do reject lần 1...",
      "annotations": [...], 
      "status": "REJECTED",
      "submittedAt": "2024-03-15T...",
      "reviewedAt": "2024-03-15T..."
    }
  ]
}
```

---

## 2. Công việc cần làm phía Frontend (FE)

Bạn cần sử dụng mảng `submissionHistory` vừa được trả về trong object assignment để xây dựng giao diện xem lại lịch sử.

### 2.1. Thêm Tab "History" ở Sidebar
- Tại file `WorkspaceSidebar.tsx` (hoặc tương tự), bên cạnh các tab `Regions` và `Discussion`, bổ sung thêm một tab **History**.
- Nếu mảng `submissionHistory` rỗng, hiển thị thông báo "Chưa có lịch sử" (task chưa từng bị reject).

### 2.2. Xây dựng Component hiển thị danh sách (`HistoryPanel.tsx`)
Bên trong tab History, tạo một component để map qua mảng `submissionHistory`:
- Mỗi item nên hiển thị:
    - **Lần nộp thứ mấy** (dựa vào `submissionNumber`).
    - **Thời gian bị reject** (`reviewedAt`).
    - **Nhận xét của Reviewer** (`reviewComment`).
- Khi user click vào một item trong danh sách này, FE cần **thay đổi mảng annotations đang hiển thị trên canvas** thành mảng `annotations` của item đó (như một tính năng "Xem trước/Preview").
- Khi đang xem preview lịch sử, Canvas phải ở chế độ **Read-only** (khóa hoàn toàn việc thêm/sửa/xóa boxes). FE có thể hiển thị một banner thông báo: *"Đang xem lại lịch sử nộp lần X. Quay lại hiện tại để tiếp tục làm"* để user không bị nhầm lẫn.

### 2.3. Cập nhật "Review Comments" cũ
- Hiện tại ở màn hình Discussion đang hiển thị `reviewComment` mới nhất. Giao diện có thể giữ nguyên phần này để nhấn mạnh feedback mới nhất, và có thể trích xuất các comment cũ từ mảng `submissionHistory` vào tab History, hoặc hiển thị thành dạng timeline/history log nếu muốn mang lại trải nghiệm tốt hơn.

### Tóm tắt Action cho FE:
1. Load field `submissionHistory` từ `assignment`.
2. Tạo tab "History" hiển thị danh sách các lần reject trước đó.
3. Cho phép click vào từng item lịch sử để view lại `annotations` cũ trên Canvas (chế độ Read-only).
