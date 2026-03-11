# Reviewer Flow Guide - Hướng dẫn FE gọi API

> Tài liệu mô tả luồng Reviewer end-to-end, mapping từng màn UI → API cần gọi.

---

## Mục lục

1. [Tổng quan luồng](#1-tổng-quan-luồng)
2. [Màn 1: Danh sách Projects](#2-màn-1-danh-sách-projects---reviewer)
3. [Màn 2: Project Detail - Review Queue](#3-màn-2-project-detail---review-queue)
4. [Màn 3: Review Workspace](#4-màn-3-review-workspace---xem-và-đánh-giá-annotation)
5. [Màn 4: Review Queue (Global)](#5-màn-4-review-queue-global)
6. [Status Transitions](#6-status-transitions)
7. [Checklist FE cần nối](#7-checklist-fe-cần-nối)

---

## 1. Tổng quan luồng

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  Danh sách      │     │  Project Detail       │     │  Review Workspace   │
│  Projects       │────▶│  (Review Queue)       │────▶│  (Xem annotation    │
│                 │     │                       │     │   + Approve/Reject) │
│  GET /projects  │     │  GET /queue           │     │                     │
│                 │     │  ?projectId=xxx       │     │  GET /assignments/  │
│                 │     │                       │     │       :id           │
└─────────────────┘     └──────────────────────┘     │  POST /approve      │
                                                     │  POST /reject       │
                                                     └─────────────────────┘
                         ┌──────────────────────┐
                         │  Stats Cards         │
                         │  (trên ReviewQueue)   │
                         │                       │
                         │  GET /stats           │
                         └──────────────────────┘
```

**Base URL**: `/api/v1`

**Auth**: Tất cả API yêu cầu JWT token trong header `Authorization: Bearer <token>`

**Role**: Reviewer routes yêu cầu user có role `REVIEWER`

---

## 2. Màn 1: Danh sách Projects (`/reviewer`)

**File**: `client/src/features/reviewer/pages/ReviewerProjects.tsx`

**Mô tả**: Hiển thị bảng danh sách project mà reviewer được gán vào. Có search bar filter client-side.

### API cần gọi

#### Khi mount component:

```typescript
// GET /api/v1/reviewer/projects
const projects = await reviewerApi.getMyProjects();
```

**Response**:
```typescript
interface ReviewerProject {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ARCHIVED';
  progress: number;             // 0-100 (tính từ tasks DONE / total tasks)
  category: { id: string; name: string };
  _count: {
    tasks: number;              // Số tasks có assignment cho reviewer này (SUBMITTED + APPROVED + REJECTED)
    members: number;
  };
}
```

### User actions

| Action | Xử lý |
|--------|--------|
| Nhập search | Filter client-side theo `name` hoặc `id`, KHÔNG gọi API |
| Click vào row | `navigate('/reviewer/projects/{projectId}')` |

### Trạng thái hiện tại: ✅ Đã nối API đúng

---

## 3. Màn 2: Project Detail - Review Queue (`/reviewer/projects/:projectId`)

**File**: `client/src/features/reviewer/pages/ReviewerProjectDetailPage.tsx`

**Mô tả**: Header project + labels + stats cards + bảng review queue + tab chat.

### API cần gọi

#### Khi mount component (gọi song song):

```typescript
// 1) Lấy thông tin project (labels, description...)
// GET /api/v1/projects/:projectId
const project = await projectApi.getById(projectId);

// 2) Lấy review queue của reviewer trong project
// GET /api/v1/reviewer/queue?projectId=xxx&status=SUBMITTED&page=1&limit=100
const result = await reviewerApi.getReviewQueue({
  projectId,
  status: 'SUBMITTED',   // Mặc định pending, có thể đổi sang ALL / APPROVED / REJECTED
  page: 1,
  limit: 100
});
```

**Response cho review queue**:
```typescript
interface ReviewQueueResponse {
  data: ReviewQueueItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    reviewCounts: {
      pending: number;    // status = SUBMITTED
      approved: number;   // status = APPROVED
      rejected: number;   // status = REJECTED
      total: number;
    };
  };
}

interface ReviewQueueItem {
  id: string;               // assignmentId
  taskId: string;
  status: AssignmentStatus;
  deadline: string | null;
  annotations: any;         // JSON annotation array do annotator vẽ
  reviewComment?: string;
  rejectionCount: number;
  task: {
    id: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    difficultyLevel: 'EASY' | 'NORMAL' | 'HARD' | 'EXPERT_ONLY';
    image: {
      id: string;
      storageUrl: string;       // URL hình (Cloudinary)
      originalFilename: string;
      width: number;
      height: number;
    } | null;
    project: {
      id: string;
      name: string;
      labelConfig: any;
      projectLabels: Array<{
        label: {
          id: string;
          name: string;
          color: string;
          category?: { id: string; name: string };
        };
      }>;
    };
  };
  annotator: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
}
```

### Stats cards lấy từ `meta.reviewCounts`:

| Card | Giá trị |
|------|---------|
| Total Reviews | `meta.reviewCounts.total` hoặc `tasks.length` |
| Pending | `meta.reviewCounts.pending` |
| Approved | `meta.reviewCounts.approved` |
| Rejected | `meta.reviewCounts.rejected` |

### User actions

| Action | Xử lý |
|--------|--------|
| Filter status (dropdown) | Gọi lại `reviewerApi.getReviewQueue({ status })` |
| Search tasks | Filter client-side theo image filename, annotator name, assignment ID |
| Chuyển tab Reviews / Chat | State local |
| Click "Review" (status=SUBMITTED) | `navigate('/workspace/{assignment.id}?mode=review')` |
| Click "View" (status≠SUBMITTED) | `navigate('/workspace/{assignment.id}?mode=review')` |

### Trạng thái hiện tại: ✅ Đã nối API đúng

### ⚠️ BUG: Navigation sai

Hiện tại button `onClick={() => navigate(`/workspace/${task.taskId}`)}` dùng `task.taskId` — **sai**.

**Cần sửa thành**: `navigate(`/workspace/${task.id}?mode=review`)` — dùng `task.id` (assignmentId) và thêm `?mode=review`.

---

## 4. Màn 3: Review Workspace - Xem và đánh giá annotation (`/workspace/:assignmentId?mode=review`)

**Files chính**:
- `client/src/features/annotation/pages/WorkspacePage.tsx` (entry point — dùng chung với annotator)

**Mô tả**: Workspace full screen, reviewer xem annotations của annotator trên hình, sau đó Approve hoặc Reject.

### ⚠️ TRẠNG THÁI HIỆN TẠI: Cần nối API — `handleApprove` và `handleReject` đang là stub

### API cần gọi

#### 4.1. Khi mount workspace — Load assignment data

```typescript
// GET /api/v1/reviewer/assignments/:assignmentId
const assignment = await reviewerApi.getAssignmentDetail(assignmentId);
```

**Response**:
```typescript
interface ReviewAssignmentDetail {
  id: string;                   // assignmentId
  taskId: string;
  status: AssignmentStatus;
  deadline: string | null;
  annotations: any;             // JSON annotations do annotator vẽ
  annotatorNote?: string;
  reviewComment?: string;
  rejectionCount: number;
  maxRejections: number;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  task: {
    id: string;
    priority: string;
    difficultyLevel: string;
    image: {                    // Đầy đủ thông tin ảnh
      id: string;
      storageUrl: string;
      originalFilename: string;
      width: number;
      height: number;
      fileSize?: number;
    };
    project: {
      id: string;
      name: string;
      projectLabels: Array<{
        label: {
          id: string;
          name: string;
          color: string;
          category?: { id: string; name: string };
        };
      }>;
    };
  };
  annotator: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
  reviewer: {
    id: string;
    fullName: string;
    email: string;
  };
}
```

**Cách đổ vào workspace**:
```typescript
// useImageStore - set hình
const { setImages } = useImageStore();
setImages([{
  id: assignment.task.image.id,
  filename: assignment.task.image.originalFilename,
  status: assignment.status.toLowerCase(),
  url: assignment.task.image.storageUrl,
  thumbnail: assignment.task.image.storageUrl,
  annotationCount: assignment.annotations?.length || 0
}]);

// useAnnotationStore - load annotations có sẵn (readonly cho reviewer)
const { setAnnotations } = useAnnotationStore();
if (assignment.annotations && Array.isArray(assignment.annotations)) {
  setAnnotations(assignment.annotations);
}
```

> **Lưu ý**: Workspace ở `mode=review` cần hiển thị annotations dạng **readonly** — reviewer KHÔNG vẽ thêm mà chỉ xem.

---

#### 4.2. Approve task

Khi reviewer nhấn **Approve**:

```typescript
// POST /api/v1/reviewer/assignments/:assignmentId/approve
await reviewerApi.approveTask(assignmentId, {
  reviewComment: reviewComment    // Tùy chọn, có thể để trống
});
```

**Request body**:
```typescript
interface ApproveRequest {
  reviewComment?: string;       // Nhận xét tùy chọn
}
```

**Hành vi backend**:
- Chuyển assignment → `APPROVED`, task → `DONE`
- Gán `reviewedAt: new Date()`
- Tăng annotator reputation score (configurable qua env `REPUTATION_APPROVE_DELTA`, mặc định +2)
- Giảm `pendingReviewTasks` trong workload
- Gửi notification `TASK_APPROVED` cho annotator (qua DB + WebSocket)
- Emit event `TASK_APPROVED`

**Sau khi approve thành công**:
- Hiển thị toast success
- Navigate về `/reviewer/projects/{projectId}` hoặc chuyển sang task tiếp theo

---

#### 4.3. Reject task

Khi reviewer nhấn **Reject** → mở modal nhập lý do:

```typescript
// POST /api/v1/reviewer/assignments/:assignmentId/reject
await reviewerApi.rejectTask(assignmentId, {
  reviewComment: reviewComment    // BẮT BUỘC — không được trống
});
```

**Request body**:
```typescript
interface RejectRequest {
  reviewComment: string;          // Bắt buộc, lý do reject
}
```

**Validation**:
- `reviewComment` **không được trống** — nếu trống sẽ trả 400

**Hành vi backend**:
- Chuyển assignment → `REJECTED`, task → `TODO`
- Tăng `rejectionCount` (+1)
- Gán `reviewedAt: new Date()`
- Giảm annotator reputation score (configurable qua env `REPUTATION_REJECT_DELTA`, mặc định -1)
- Giảm `pendingReviewTasks` trong workload
- Kiểm tra `rejectionCount >= maxRejectionsBeforeReassign`:
  - **Nếu vượt giới hạn**: emit event `TASK_SKIPPED_REASSIGN` → auto-assign annotator khác
  - **Nếu chưa vượt**: annotator có thể sửa lại và re-submit
- Gửi notification `TASK_REJECTED` cho annotator (qua DB + WebSocket)
- Emit event `TASK_REJECTED`

**Sau khi reject thành công**:
- Hiển thị toast success
- Navigate về `/reviewer/projects/{projectId}` hoặc chuyển sang task tiếp theo

---

### Workspace UI — Review Mode vs Annotator Mode

| Thành phần | Annotator Mode | Review Mode |
|------------|----------------|-------------|
| **Canvas** | Có thể vẽ annotation | Chỉ xem (readonly) |
| **Toolbar** | Đầy đủ tools (rectangle, polygon...) | Ẩn hoặc chỉ zoom/pan |
| **Header Actions** | Submit, Skip, Save Draft | Approve, Reject |
| **Regions List** | Có thể sửa/xóa annotation | Chỉ xem |
| **Discussion Panel** | Nhập `annotatorNote` | Xem `annotatorNote`, nhập `reviewComment` |
| **Auto-save** | Debounce 2s save draft | Không có |
| **Labels** | Dropdown gán label | Chỉ hiển thị label đã gán |

---

### Thông tin reviewer cần hiển thị trên workspace

| Vùng | Dữ liệu | Nguồn |
|------|----------|-------|
| Header | Image filename, status badge | `assignment.task.image.originalFilename`, `assignment.status` |
| Sidebar - Info | Annotator name + avatar | `assignment.annotator` |
| Sidebar - Info | Rejection count / max | `assignment.rejectionCount` / `assignment.maxRejections` |
| Sidebar - Info | Task priority, difficulty | `assignment.task.priority`, `assignment.task.difficultyLevel` |
| Sidebar - Discussion | Annotator note | `assignment.annotatorNote` |
| Sidebar - Discussion | Previous review comments | `assignment.reviewComment` |
| Canvas | Image + annotations overlay | `assignment.task.image.storageUrl` + `assignment.annotations` |

---

## 5. Màn 4: Review Queue (Global)

**File**: `client/src/features/reviewer/pages/ReviewerQueue.tsx`

**Mô tả**: Trang tổng hợp tất cả tasks cần review từ mọi project. Hiển thị stats cards + bảng queue.

### ⚠️ TRẠNG THÁI HIỆN TẠI: Đang dùng MOCK DATA hoàn toàn — cần nối API

### API cần gọi

#### Khi mount (gọi song song):

```typescript
// 1) Lấy stats tổng quan
// GET /api/v1/reviewer/stats
const stats = await reviewerApi.getStats();

// 2) Lấy tất cả pending reviews (không filter projectId)
// GET /api/v1/reviewer/queue?page=1&limit=20
const queue = await reviewerApi.getReviewQueue({ page: 1, limit: 20 });
```

**Stats Response**:
```typescript
interface ReviewerStats {
  totalReviewed: number;          // APPROVED + REJECTED
  approvalRate: number;           // 0-100 (%)
  pendingCount: number;           // SUBMITTED count
  avgReviewTimeMinutes: number | null;  // Trung bình phút
  todayCount: number;             // Số task đã review hôm nay
  weekCount: number;              // Số task đã review tuần này
}
```

### Stats cards mapping:

| Card | Giá trị | API field |
|------|---------|-----------|
| Pending Review | `stats.pendingCount` | `GET /stats` |
| Reviewed Today | `stats.todayCount` | `GET /stats` |
| Approval Rate | `stats.approvalRate` + "%" | `GET /stats` |
| Avg. Review Time | `stats.avgReviewTimeMinutes` + "m" | `GET /stats` |

### User actions

| Action | Xử lý |
|--------|--------|
| Click "Review Now" | `navigate('/workspace/{assignment.id}?mode=review')` |

### Cần sửa trong ReviewerQueue.tsx:

1. **Xoá mock data** (`queueTasks`, `labels` hardcode)
2. **Gọi `reviewerApi.getStats()`** để fill stats cards
3. **Gọi `reviewerApi.getReviewQueue()`** để fill bảng
4. **Map response vào table** — dùng `ReviewQueueItem` interface

---

## 6. Status Transitions

### Reviewer có thể chuyển trạng thái:

```
  ┌───────────┐
  │ SUBMITTED │ ◀── Annotator submit
  └─────┬─────┘
        │ (reviewer action)
   ┌────┴─────┐
   ▼          ▼
┌──────────┐  ┌──────────┐
│ APPROVED │  │ REJECTED │
│          │  │          │
│ Task →   │  │ Task →   │
│ DONE     │  │ TODO     │
└──────────┘  └────┬─────┘
                   │
                   ▼
              Annotator sửa lại
              → IN_PROGRESS
              → SUBMITTED (re-submit)
              → Reviewer review lại
```

### Bảng chuyển trạng thái chi tiết:

| Trạng thái hiện tại | Reviewer có thể chuyển sang | API call |
|---|---|---|
| `SUBMITTED` | `APPROVED` | `POST /assignments/:id/approve` |
| `SUBMITTED` | `REJECTED` | `POST /assignments/:id/reject` (bắt buộc `reviewComment`) |
| `APPROVED` | ❌ Không thể thay đổi | Task hoàn thành |
| `REJECTED` | ❌ Chờ annotator re-submit | Annotator sẽ sửa lại |

### Rejection limit logic:

```
rejectionCount >= maxRejectionsBeforeReassign (từ AssignmentRule)
  → YES: Auto-reassign task cho annotator khác (event TASK_SKIPPED_REASSIGN)
  → NO:  Annotator hiện tại có thể sửa lại và re-submit
```

---

## 7. Checklist FE cần nối

### ✅ Đã hoàn thành (đang gọi API thật)

- [x] `ReviewerProjects.tsx` → `GET /reviewer/projects`
- [x] `ReviewerProjectDetailPage.tsx` → `GET /reviewer/queue?projectId=xxx` + `GET /projects/:id`

### ❌ Cần implement

| # | Task | File cần sửa | Chi tiết |
|---|------|-------------|----------|
| 1 | **Fix navigation URL** | `ReviewerProjectDetailPage.tsx` | Đổi `navigate(`/workspace/${task.taskId}`)` → `navigate(`/workspace/${task.id}?mode=review`)` |
| 2 | **Thêm `getAssignmentDetail` vào API service** | `reviewer.api.ts` | Thêm method gọi `GET /reviewer/assignments/:assignmentId` |
| 3 | **Thêm `approveTask` vào API service** | `reviewer.api.ts` | Thêm method gọi `POST /reviewer/assignments/:id/approve` |
| 4 | **Thêm `rejectTask` vào API service** | `reviewer.api.ts` | Thêm method gọi `POST /reviewer/assignments/:id/reject` |
| 5 | **Thêm `getStats` vào API service** | `reviewer.api.ts` | Thêm method gọi `GET /reviewer/stats` |
| 6 | **Load assignment data trong Workspace (review mode)** | `WorkspacePage.tsx` | Khi `mode=review`, gọi `reviewerApi.getAssignmentDetail(assignmentId)` thay vì annotator API |
| 7 | **Implement `handleApprove`** | `WorkspacePage.tsx` | Gọi `reviewerApi.approveTask(assignmentId, { reviewComment })` |
| 8 | **Implement `handleReject`** | `WorkspacePage.tsx` | Mở modal bắt buộc nhập comment → gọi `reviewerApi.rejectTask(assignmentId, { reviewComment })` |
| 9 | **Nối ReviewerQueue với API thật** | `ReviewerQueue.tsx` | Xoá mock data, gọi `getStats()` + `getReviewQueue()` |
| 10 | **Reject Modal** | `WorkspacePage.tsx` hoặc component mới | Dialog bắt buộc nhập `reviewComment` trước khi reject |

### Các method cần thêm vào `reviewer.api.ts`:

```typescript
export const reviewerApi = {
    // ... existing methods ...

    /**
     * Get assignment detail for review
     */
    getAssignmentDetail: async (assignmentId: string) => {
        const response = await apiClient.get(`${BASE_URL}/assignments/${assignmentId}`);
        return response.data;
    },

    /**
     * Approve a task assignment
     */
    approveTask: async (assignmentId: string, data: { reviewComment?: string }) => {
        const response = await apiClient.post(
            `${BASE_URL}/assignments/${assignmentId}/approve`,
            data
        );
        return response.data;
    },

    /**
     * Reject a task assignment (reviewComment bắt buộc)
     */
    rejectTask: async (assignmentId: string, data: { reviewComment: string }) => {
        const response = await apiClient.post(
            `${BASE_URL}/assignments/${assignmentId}/reject`,
            data
        );
        return response.data;
    },

    /**
     * Get reviewer statistics
     */
    getStats: async () => {
        const response = await apiClient.get(`${BASE_URL}/stats`);
        return response.data;
    }
};
```

---

## Tổng kết

**Backend API đã đầy đủ** — 6 endpoints cho luồng reviewer:

| # | Method | Endpoint | Mô tả |
|---|--------|----------|--------|
| 1 | `GET` | `/reviewer/projects` | Danh sách projects |
| 2 | `GET` | `/reviewer/queue` | Review queue (có filter) |
| 3 | `GET` | `/reviewer/stats` | Thống kê reviewer |
| 4 | `GET` | `/reviewer/assignments/:id` | Chi tiết assignment |
| 5 | `POST` | `/reviewer/assignments/:id/approve` | Approve task |
| 6 | `POST` | `/reviewer/assignments/:id/reject` | Reject task |

**Frontend cần nối**:
- 2 trang (Projects, Project Detail) đã nối API ✅
- **ReviewerQueue** đang dùng mock data hoàn toàn — cần connect `getStats()` + `getReviewQueue()`
- **Workspace review mode** — cần implement `getAssignmentDetail()`, `handleApprove()`, `handleReject()`
- **Fix bug navigation**: dùng `assignmentId` (không phải `taskId`) + thêm `?mode=review`
