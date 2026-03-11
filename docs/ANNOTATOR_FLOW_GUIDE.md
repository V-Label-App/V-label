# Annotator Flow Guide - Hướng dẫn FE gọi API

> Tài liệu mô tả luồng Annotator end-to-end, mapping từng màn UI → API cần gọi.

---

## Mục lục

1. [Tổng quan luồng](#1-tổng-quan-luồng)
2. [Màn 1: Danh sách Projects](#2-màn-1-danh-sách-projects---annotator)
3. [Màn 2: Project Detail - Danh sách Tasks](#3-màn-2-project-detail---danh-sách-tasks)
4. [Màn 3: Annotation Workspace](#4-màn-3-annotation-workspace---vẽ-gán-nhãn)
5. [Màn 4: Performance Dashboard](#5-màn-4-performance-dashboard)
6. [Status Transitions](#6-status-transitions)
7. [Checklist FE cần nối](#7-checklist-fe-cần-nối)

---

## 1. Tổng quan luồng

```
┌─────────────────┐     ┌──────────────────────┐     ┌────────────────────┐
│  Danh sách      │     │  Project Detail       │     │  Workspace         │
│  Projects       │────▶│  (Danh sách Tasks)    │────▶│  (Vẽ annotation)   │
│                 │     │                       │     │                    │
│  GET /projects  │     │  GET /tasks           │     │  GET /tasks/:id    │
│                 │     │  GET /projects/:id    │     │  PUT /draft        │
│                 │     │                       │     │  PATCH /tasks/:id  │
└─────────────────┘     └──────────────────────┘     └────────────────────┘
                                                              │
                                                     ┌────────────────────┐
                                                     │  Performance       │
                                                     │  Dashboard         │
                                                     │                    │
                                                     │  GET /weekly       │
                                                     │  GET /distribution │
                                                     │  GET /today        │
                                                     └────────────────────┘
```

**Base URL**: `/api/v1`

**Auth**: Tất cả API yêu cầu JWT token trong header `Authorization: Bearer <token>`

**Role**: Annotator routes yêu cầu user có role `ANNOTATOR`

---

## 2. Màn 1: Danh sách Projects (`/annotator`)

**File**: `client/src/features/annotator/pages/AnnotatorTasks.tsx`

**Mô tả**: Hiển thị bảng danh sách project mà annotator được gán vào. Có search bar filter client-side.

### API cần gọi

#### Khi mount component:

```typescript
// GET /api/v1/annotator/projects
const projects = await annotatorApi.getMyProjects();
```

**Response**:
```typescript
interface AnnotatorProject {
  id: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ARCHIVED';
  progress: number;             // 0-100
  category: { id: string; name: string };
  _count: { tasks: number; members: number };
}
```

### User actions

| Action | Xử lý |
|--------|--------|
| Nhập search | Filter client-side, KHÔNG gọi API |
| Click vào row | `navigate('/annotator/projects/{projectId}')` |

### Trạng thái hiện tại: ✅ Đã nối API đúng

---

## 3. Màn 2: Project Detail - Danh sách Tasks (`/annotator/projects/:projectId`)

**File**: `client/src/features/annotator/pages/AnnotatorProjectDetailPage.tsx`

**Mô tả**: Header project + labels + stats + bảng tasks + tab chat.

### API cần gọi

#### Khi mount component (gọi song song):

```typescript
// 1) Lấy thông tin project (labels, description...)
// GET /api/v1/projects/:projectId
const project = await projectApi.getById(projectId);

// 2) Lấy danh sách tasks của annotator trong project
// GET /api/v1/annotator/tasks?projectId=xxx&page=1&limit=100
const taskResponse = await annotatorApi.getMyTasks({
  projectId: projectId,
  page: 1,
  limit: 100
});
```

**Response cho tasks**:
```typescript
interface TaskListResponse {
  data: TaskAssignmentListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    taskCounts: {
      assigned: number;
      submitted: number;
      rejected: number;
      inProgress: number;
      total: number;
    };
  };
}

interface TaskAssignmentListItem {
  id: string;               // assignmentId - dùng để navigate workspace
  taskId: string;
  status: AssignmentStatus;
  deadline?: string;
  annotatorNote?: string;
  reviewComment?: string;
  reviewScore?: number;
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
    };
    project: {
      id: string;
      name: string;
      labelConfig: any;            // Config label cho project
      projectLabels: Array<{       // Danh sách labels có thể gán
        id: string;
        name: string;
        color: string;
        category?: string;
      }>;
    };
  };
}
```

### Stats cards lấy từ `meta.taskCounts`:

| Card | Giá trị |
|------|---------|
| My Tasks | `meta.taskCounts.total` |
| Assigned | `meta.taskCounts.assigned` |
| Submitted | `meta.taskCounts.submitted` |
| Rejected | `meta.taskCounts.rejected` |
| Progress bar | `(submitted / total) * 100` |

### User actions

| Action | Xử lý |
|--------|--------|
| Filter/Search tasks | Filter client-side |
| Chuyển tab My Tasks / Chat | State local |
| Click task → **Start / Fix / View** | `navigate('/workspace/{assignment.id}')` |

### Trạng thái hiện tại: ✅ Đã nối API đúng

---

## 4. Màn 3: Annotation Workspace - Vẽ gán nhãn (`/workspace/:taskId`)

**Files chính**:
- `client/src/features/annotation/pages/WorkspacePage.tsx` (entry point)
- `client/src/features/annotation/pages/Workspace.tsx` (standalone)

**Mô tả**: Workspace full screen gồm: Header (actions), Toolbar (tools), Canvas (vẽ), Sidebar (regions + discussion), ImageNavigator (chuyển ảnh).

### ⚠️ TRẠNG THÁI HIỆN TẠI: Đang dùng MOCK DATA - cần nối API

### API cần gọi

#### 4.1. Khi mount workspace — Load task data + hình

```typescript
// GET /api/v1/annotator/tasks/:assignmentId
const assignment = await annotatorApi.getTaskAssignment(assignmentId);

// Trích xuất dữ liệu:
const imageUrl = assignment.task.image.storageUrl;
const labels = assignment.task.project.projectLabels;  // labels cho dropdown
const existingAnnotations = assignment.annotations;    // annotations đã lưu (nếu có)
const annotatorNote = assignment.annotatorNote;
const reviewComment = assignment.reviewComment;
const taskStatus = assignment.status;
```

**Cách đổ vào stores**:
```typescript
// useImageStore - set hình
const { setImages } = useImageStore();
setImages([{
  id: assignment.task.image.id,
  filename: assignment.task.image.originalFilename,
  status: assignment.status.toLowerCase(),
  url: assignment.task.image.storageUrl,
  thumbnail: assignment.task.image.storageUrl,  // dùng luôn URL gốc
  annotationCount: existingAnnotations?.length || 0
}]);

// useAnnotationStore - load annotations đã lưu (nếu có)
const { setAnnotations } = useAnnotationStore();
if (existingAnnotations && Array.isArray(existingAnnotations)) {
  setAnnotations(existingAnnotations);
}
```

> **Lưu ý**: Hiện tại `WorkspacePage.tsx` đang dùng `mockImages` (7 hình SVG giả). Cần thay bằng API call ở trên.

---

#### 4.2. Trong khi vẽ — Auto-save draft (debounce)

Khi annotator vẽ/sửa annotation, dùng debounce để auto-save:

```typescript
// PUT /api/v1/annotator/tasks/:assignmentId/draft
await annotatorApi.saveDraft(assignmentId, {
  annotations: annotations,          // JSON array các annotation
  annotatorNote: annotatorNote,      // max 1000 ký tự
  actualTimeSeconds: elapsedSeconds  // thời gian làm (tính bằng giây)
});
```

**Request body**:
```typescript
interface SaveDraftRequest {
  annotations?: any;           // JSON annotations array
  annotatorNote?: string;      // max 1000 chars
  actualTimeSeconds?: number;  // >= 0, integer
}
```

**Hành vi backend**:
- Nếu task đang ở `ASSIGNED` → tự chuyển sang `IN_PROGRESS`
- KHÔNG chuyển sang `SUBMITTED`
- Không cho save nếu status là `SUBMITTED`, `APPROVED`, hoặc `SKIPPED`

**Cách implement auto-save**:
```typescript
// Trong useEffect, watch annotations thay đổi
useEffect(() => {
  const timer = setTimeout(async () => {
    setAutoSaveStatus('saving');
    try {
      await annotatorApi.saveDraft(assignmentId, {
        annotations: annotations,
        annotatorNote: note,
        actualTimeSeconds: elapsed
      });
      setAutoSaveStatus('saved');
    } catch {
      setAutoSaveStatus('unsaved');
    }
  }, 2000); // debounce 2 giây

  setAutoSaveStatus('unsaved');
  return () => clearTimeout(timer);
}, [annotations, note]);
```

> **Lưu ý**: Hiện tại FE chưa có method `saveDraft` trong `annotator.api.ts`. Cần thêm:
> ```typescript
> saveDraft: async (assignmentId: string, data: SaveDraftRequest) => {
>   const response = await apiClient.put(`${BASE_URL}/tasks/${assignmentId}/draft`, data);
>   return response.data;
> }
> ```

---

#### 4.3. Submit annotation

Khi annotator nhấn nút **Submit** trên header:

```typescript
// PATCH /api/v1/annotator/tasks/:assignmentId
await annotatorApi.updateTaskAssignment(assignmentId, {
  status: 'SUBMITTED',
  annotations: annotations,          // gửi annotations cuối cùng
  annotatorNote: annotatorNote       // ghi chú (nếu có)
});
```

**Validation cần làm ở FE trước khi submit**:
- Kiểm tra có ít nhất 1 annotation
- Kiểm tra tất cả annotation đều có label

**Sau khi submit thành công**:
- Hiển thị thông báo success
- Navigate về `/annotator/projects/{projectId}` hoặc chuyển sang task tiếp theo

---

#### 4.4. Skip task

Khi annotator nhấn nút **Skip** trên header:

```typescript
// PATCH /api/v1/annotator/tasks/:assignmentId
await annotatorApi.updateTaskAssignment(assignmentId, {
  status: 'SKIPPED'
});
```

**Chỉ skip được khi status là**: `ASSIGNED` hoặc `IN_PROGRESS`

---

#### 4.5. Re-submit (sau khi bị reject)

Khi task bị reject, annotator mở lại workspace và nhấn **Re-Submit**:

```typescript
// PATCH /api/v1/annotator/tasks/:assignmentId
await annotatorApi.updateTaskAssignment(assignmentId, {
  status: 'SUBMITTED',
  annotations: updatedAnnotations,
  annotatorNote: updatedNote
});
```

---

### Workspace UI Components → Data Mapping

| Component | Data cần | Nguồn |
|-----------|----------|-------|
| **WorkspaceHeader** | filename, status, autoSaveStatus | `useImageStore` |
| **WorkspaceToolbar** | tool, zoom, undo/redo state | `useCanvasStore`, `useAnnotationStore` |
| **WorkspaceCanvas** | imageUrl, annotations, tool | `useImageStore`, `useAnnotationStore`, `useCanvasStore` |
| **AnnotationLayer** | annotations[], selectedId | `useAnnotationStore` |
| **Rectangle** | annotation object | Props từ AnnotationLayer |
| **ImageNavigator** | images[], currentIndex | `useImageStore` |
| **RegionsList** | annotations[] | `useAnnotationStore` |
| **RegionCard** | annotation, labels dropdown | `useAnnotationStore` + `projectLabels` |
| **DiscussionPanel** | annotatorNote, reviewComment | Từ API `getTaskAssignment` |

---

### Labels cho annotation

Hiện tại labels hardcode trong `client/src/features/annotation/constants.ts`:
```typescript
export const availableLabels = ['Normal', 'Abnormal', 'Uncertain'];
```

**Nên thay bằng**: `assignment.task.project.projectLabels` từ API để dynamic theo project.

---

## 5. Màn 4: Performance Dashboard (`/annotator/performance`)

**File**: `client/src/features/annotator/pages/AnnotatorPerformancePage.tsx`

### API cần gọi (song song khi mount):

```typescript
// 1) Biểu đồ cột - Hoạt động 7 ngày
// GET /api/v1/performance/weekly-activity
const weekly = await performanceApi.getWeeklyActivity();
// Response: [{ name: "Mon", completed: 5, rejected: 1 }, ...]

// 2) Biểu đồ tròn - Phân bố trạng thái
// GET /api/v1/performance/task-distribution
const distribution = await performanceApi.getTaskDistribution();
// Response: [{ name: "Assigned", value: 10, color: "#3B82F6" }, ...]

// 3) Biểu đồ area - Tiến độ hôm nay
// GET /api/v1/performance/today-progress
const today = await performanceApi.getTodayProgress();
// Response: [{ time: "9 AM", tasks: 3 }, ...]
```

**Stats cards tính từ distribution**:
```typescript
const total = distribution.reduce((sum, d) => sum + d.value, 0);
const submitted = distribution.find(d => d.name === 'Submitted')?.value || 0;
const rejected = distribution.find(d => d.name === 'Rejected')?.value || 0;
const accuracy = total > 0 ? ((submitted / total) * 100).toFixed(1) : 0;
```

### Trạng thái hiện tại: ✅ Đã nối API đúng

---

## 6. Status Transitions

### Annotator có thể chuyển trạng thái:

```
            ┌──────────┐
            │ ASSIGNED │
            └────┬─────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
  ┌────────────┐    ┌─────────┐
  │IN_PROGRESS │    │ SKIPPED │
  └─────┬──────┘    └────┬────┘
        │                │
        ▼                │ (resume)
  ┌───────────┐          │
  │ SUBMITTED │◀─────────┘
  └─────┬─────┘
        │ (reviewer action)
   ┌────┴─────┐
   ▼          ▼
┌──────┐  ┌──────────┐
│APPRO-│  │ REJECTED │──▶ IN_PROGRESS ──▶ SUBMITTED
│VED   │  └──────────┘    (sửa lại)       (re-submit)
└──────┘
```

### Bảng chuyển trạng thái chi tiết:

| Trạng thái hiện tại | Annotator có thể chuyển sang | API call |
|---|---|---|
| `ASSIGNED` | `IN_PROGRESS` (tự động khi save draft) | `PUT /draft` |
| `ASSIGNED` | `SKIPPED` | `PATCH` với `status: 'SKIPPED'` |
| `IN_PROGRESS` | `SUBMITTED` | `PATCH` với `status: 'SUBMITTED'` + annotations |
| `IN_PROGRESS` | `SKIPPED` | `PATCH` với `status: 'SKIPPED'` |
| `REJECTED` | `IN_PROGRESS` → `SUBMITTED` | Save draft rồi re-submit |
| `SUBMITTED` | ❌ Không thể thay đổi | Chờ reviewer |
| `APPROVED` | ❌ Không thể thay đổi | Task hoàn thành |
| `SKIPPED` | `IN_PROGRESS` | `PATCH` với `status: 'IN_PROGRESS'` |

---

## 7. Checklist FE cần nối

### ✅ Đã hoàn thành (đang gọi API thật)

- [x] `AnnotatorTasks.tsx` → `GET /annotator/projects`
- [x] `AnnotatorProjectDetailPage.tsx` → `GET /annotator/tasks` + `GET /projects/:id`
- [x] `AnnotatorPerformancePage.tsx` → `GET /performance/*` (3 endpoints)

### ❌ Cần implement (đang dùng mock data)

| # | Task | File cần sửa | Chi tiết |
|---|------|-------------|----------|
| 1 | **Load task data trong Workspace** | `WorkspacePage.tsx` | Thay `mockImages` bằng `annotatorApi.getTaskAssignment(taskId)` |
| 2 | **Thêm `saveDraft` vào API service** | `annotator.api.ts` | Thêm method `saveDraft(assignmentId, data)` gọi `PUT /tasks/:id/draft` |
| 3 | **Auto-save khi vẽ** | `WorkspacePage.tsx` | Debounce 2s → gọi `saveDraft` khi annotations thay đổi |
| 4 | **Submit annotation** | `WorkspacePage.tsx` | Nút Submit → `PATCH /tasks/:id` với `status: 'SUBMITTED'` |
| 5 | **Skip task** | `WorkspacePage.tsx` | Nút Skip → `PATCH /tasks/:id` với `status: 'SKIPPED'` |
| 6 | **Dynamic labels** | `RegionCard.tsx`, `constants.ts` | Lấy labels từ `project.projectLabels` thay vì hardcode |
| 7 | **Nối DiscussionPanel** | `DiscussionPanel.tsx` | Hiển thị `annotatorNote` + `reviewComment` từ API, sync `annotatorNote` vào draft |
| 8 | **Nối ImageNavigator** | `WorkspacePage.tsx` | Nếu 1 task = 1 ảnh thì ẩn navigator. Nếu nhiều task liên tiếp thì load danh sách tasks làm navigator |

### Annotation JSON format gửi lên server

```typescript
// Mỗi annotation trong array:
interface AnnotationPayload {
  id: string;
  label: string;           // Tên label (vd: "Normal", "Abnormal")
  type: 'rectangle';
  x: number;               // Tọa độ pixel
  y: number;
  width: number;
  height: number;
  visible: boolean;
  createdBy?: string;      // userId
  createdAt: string;       // ISO date
  aiSuggested?: boolean;
}

// Gửi lên server dạng JSON array:
{
  "annotations": [
    { "id": "abc", "label": "Normal", "type": "rectangle", "x": 100, "y": 200, "width": 300, "height": 150, "visible": true },
    { "id": "def", "label": "Abnormal", "type": "rectangle", "x": 400, "y": 100, "width": 200, "height": 200, "visible": true }
  ]
}
```

---

## Tổng kết

**Backend API đã đầy đủ** — tất cả endpoints cần thiết cho luồng annotator đều đã implement và hoạt động.

**Frontend cần nối phần Workspace** — 3 trang (Projects, Project Detail, Performance) đã nối đúng. Chỉ còn **Workspace** (vẽ gán nhãn) đang dùng mock data, cần connect vào các API:

1. `GET /annotator/tasks/:assignmentId` → load hình + annotations + labels
2. `PUT /annotator/tasks/:assignmentId/draft` → auto-save
3. `PATCH /annotator/tasks/:assignmentId` → submit / skip
