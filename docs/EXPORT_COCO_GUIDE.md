# Export COCO JSON — Hướng dẫn & Giải thích kỹ thuật

## Mục lục
1. [Tổng quan](#1-tổng-quan)
2. [Điều kiện để export](#2-điều-kiện-để-export)
3. [Luồng hoạt động](#3-luồng-hoạt-động)
4. [COCO JSON format](#4-coco-json-format)
5. [Train / Val / Test Split](#5-train--val--test-split)
6. [Cấu trúc file ZIP output](#6-cấu-trúc-file-zip-output)
7. [Cách sử dụng với ML framework](#7-cách-sử-dụng-với-ml-framework)
8. [API Reference](#8-api-reference)
9. [File liên quan trong codebase](#9-file-liên-quan-trong-codebase)

---

## 1. Tổng quan

Sau khi một project đạt **100% progress** (tất cả task đều được annotate và approve bởi Reviewer), Manager có thể export toàn bộ annotation ra định dạng **COCO JSON** — chuẩn format phổ biến nhất trong lĩnh vực Computer Vision / Object Detection.

Output là một file **ZIP** chứa 3 file JSON tương ứng với 3 tập dữ liệu ML:

```
Export_<ProjectName>-coco.zip
├── train.json   ← dùng để train model
├── val.json     ← dùng để validate trong quá trình train
└── test.json    ← dùng để đánh giá model sau khi train xong
```

---

## 2. Điều kiện để export

| Điều kiện | Lý do |
|-----------|-------|
| `projectProgress === 100%` | Chỉ export khi **toàn bộ** data đã được review, đảm bảo chất lượng |
| Chỉ lấy assignment có `status = APPROVED` | Loại bỏ annotation bị reject hoặc chưa review — chỉ data chất lượng cao mới vào dataset |
| Role `MANAGER` hoặc `ADMIN` | Chỉ người có quyền quản lý project mới được export |

> **Lưu ý:** `projectProgress` được tính bằng `(số task APPROVED / tổng số task) * 100`.

---

## 3. Luồng hoạt động

```
Manager click "Export COCO"
        │
        ▼
ExportDialog mở ra
(Manager chọn tỉ lệ Train/Val/Test, mặc định 70/20/10)
        │
        ▼
POST /api/projects/:id/export/coco
{ trainRatio: 0.7, valRatio: 0.2, testRatio: 0.1 }
        │
        ▼
ExportController.exportCOCO()
        │
        ▼
ExportService.exportCOCOSplit()
  ├─ Query project + labels từ DB
  ├─ Query tất cả TaskAssignment có status = APPROVED
  ├─ Deduplicate: mỗi task chỉ lấy 1 assignment (mới nhất)
  ├─ Build danh sách AnnotatedImage (image metadata + annotations)
  ├─ Shuffle deterministic (ổn định qua nhiều lần export)
  └─ Split thành train / val / test theo tỉ lệ
        │
        ▼
JSZip đóng gói 3 file JSON thành .zip
        │
        ▼
Browser tự động download file ZIP
```

---

## 4. COCO JSON format

COCO (Common Objects in Context) là format chuẩn của Microsoft, được hầu hết ML framework hỗ trợ (PyTorch, Detectron2, MMDetection, YOLOv8...).

Mỗi file JSON có cấu trúc:

```json
{
  "info": {
    "description": "Tên project",
    "version": "1.0",
    "year": 2026,
    "contributor": "VLabel Platform",
    "date_created": "2026-03-17",
    "split": "train"
  },
  "licenses": [],
  "images": [
    {
      "id": 1,
      "file_name": "dog_001.jpg",
      "coco_url": "https://res.cloudinary.com/.../dog_001.jpg",
      "width": 1920,
      "height": 1080,
      "license": 0,
      "date_captured": "2026-03-10"
    }
  ],
  "annotations": [
    {
      "id": 1,
      "image_id": 1,
      "category_id": 2,
      "segmentation": [],
      "area": 48000,
      "bbox": [120, 80, 200, 240],
      "iscrowd": 0
    }
  ],
  "categories": [
    {
      "id": 1,
      "name": "Mèo",
      "supercategory": "Động vật"
    },
    {
      "id": 2,
      "name": "Chó",
      "supercategory": "Động vật"
    }
  ]
}
```

### Giải thích các field quan trọng

#### `images[]`
| Field | Ý nghĩa |
|-------|---------|
| `id` | ID tuần tự trong file JSON này (không phải UUID từ DB) |
| `file_name` | Tên file gốc khi upload vào VLabel |
| `coco_url` | URL Cloudinary để tải ảnh về |
| `width`, `height` | Kích thước ảnh thật (pixel) — quan trọng để normalize tọa độ |

#### `annotations[]`
| Field | Ý nghĩa |
|-------|---------|
| `image_id` | Tham chiếu đến `images[].id` |
| `category_id` | Tham chiếu đến `categories[].id` |
| `bbox` | **`[x, y, width, height]`** — góc trên-trái + kích thước (pixel) |
| `area` | `width × height` của bounding box |
| `iscrowd` | Luôn `0` (không dùng RLE mask) |
| `segmentation` | Luôn `[]` (chỉ hỗ trợ bounding box, chưa có polygon) |

> **Chú ý về tọa độ bbox:** VLabel lưu tọa độ pixel tuyệt đối. COCO format cũng dùng pixel tuyệt đối. Không cần normalize.

#### `categories[]`
| Field | Ý nghĩa |
|-------|---------|
| `name` | Tên label trong project (vd: "Chó", "Mèo") |
| `supercategory` | Tên LabelCategory nếu label có thuộc nhóm (vd: "Động vật"). Nếu không có → `"none"` |

---

## 5. Train / Val / Test Split

### Tại sao phải chia?

Nếu train model trên **toàn bộ** data và đánh giá cũng trên **cùng** data đó → model chỉ đang *ghi nhớ* (memorize), không thực sự học được pattern tổng quát. Khi gặp ảnh mới ngoài đời thực → kết quả rất kém. Hiện tượng này gọi là **overfitting**.

Chia dataset giải quyết vấn đề này:

```
                    Toàn bộ dataset (100 ảnh)
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      train.json        val.json        test.json
      70 ảnh            20 ảnh           10 ảnh
    (model học)    (check overfitting  (đánh giá
                    sau mỗi epoch)      cuối cùng)
```

### Vai trò của từng tập

#### Train set (mặc định: 70%)
- Model học **weights** từ tập này
- Càng nhiều data train → model càng tổng quát
- Không được dùng để đánh giá — kết quả trên train set luôn cao vì model "đã thấy" data

#### Validation set (mặc định: 20%)
- Được kiểm tra **sau mỗi epoch** training
- Nếu `train accuracy` tăng nhưng `val accuracy` giảm → đang overfit → dừng lại (Early Stopping)
- Dùng để chọn hyperparameters tốt nhất (learning rate, batch size, số epoch...)
- Model **không học** trực tiếp từ val set, nhưng engineer dùng nó để điều chỉnh → val set vẫn bị "nhìn thấy" gián tiếp

#### Test set (mặc định: 10%)
- Model **không được nhìn thấy** trong toàn bộ quá trình train
- Chỉ dùng **một lần duy nhất** sau khi chọn xong model tốt nhất
- Kết quả trên test set = **accuracy thực tế** khi deploy
- Nếu test nhiều lần và chọn model theo test set → kết quả bị "leak", không còn đáng tin

### Thuật toán shuffle

VLabel dùng **deterministic shuffle** (không random) để đảm bảo:
- Cùng một dataset luôn cho ra cùng một split
- Có thể reproduce kết quả ML
- Không bị ảnh hưởng bởi thứ tự insert vào DB

```typescript
// Fisher-Yates deterministic: j = i % (i+1) thay vì random
for (let i = n-1; i > 0; i--) {
  const j = i % (i + 1)  // deterministic, không random
  swap(arr[i], arr[j])
}
```

### Tỉ lệ recommended

| Tổng số ảnh | Recommended split | Lý do |
|-------------|-------------------|-------|
| < 100 ảnh | 80/10/10 | Dataset nhỏ, cần nhiều data train nhất có thể |
| 100–1000 ảnh | 70/20/10 | Cân bằng giữa train và validation |
| > 1000 ảnh | 70/15/15 hoặc 60/20/20 | Đủ data để val/test có ý nghĩa thống kê |

---

## 6. Cấu trúc file ZIP output

```
Export_<ProjectName>-coco.zip
├── train.json    ← ~70% ảnh, dùng để train
├── val.json      ← ~20% ảnh, dùng để validate
└── test.json     ← ~10% ảnh, dùng để test cuối
```

Tên file: `Export_<project_name_no_special_chars>-coco.zip`

Ví dụ: Project tên "Phát hiện chó mèo" → `Export_Phát_hiện_chó_mèo-coco.zip`

---

## 7. Cách sử dụng với ML framework

### Ultralytics YOLOv8 (Python)

```python
from ultralytics import YOLO

# Giải nén ZIP
import zipfile
with zipfile.ZipFile("Export_MyProject-coco.zip", "r") as z:
    z.extractall("./dataset/annotations/")

# Tạo dataset.yaml
# YOLOv8 cần convert COCO → YOLO format trước
# Dùng: pip install pycocotools

model = YOLO("yolov8n.pt")
model.train(
    data="dataset.yaml",
    epochs=100,
    imgsz=640
)
```

### Detectron2 (Facebook)

```python
from detectron2.data.datasets import register_coco_instances

register_coco_instances(
    "my_dataset_train", {},
    "dataset/annotations/train.json",
    "dataset/images/"          # thư mục chứa ảnh download từ coco_url
)
register_coco_instances(
    "my_dataset_val", {},
    "dataset/annotations/val.json",
    "dataset/images/"
)
```

### Hugging Face Transformers

```python
from datasets import load_dataset

dataset = load_dataset(
    "json",
    data_files={
        "train": "train.json",
        "validation": "val.json",
        "test": "test.json"
    }
)
```

### Tải ảnh về local

Trường `coco_url` trong mỗi image là URL Cloudinary. Để train local:

```python
import requests
import json
import os

with open("train.json") as f:
    coco = json.load(f)

os.makedirs("images", exist_ok=True)
for img in coco["images"]:
    r = requests.get(img["coco_url"])
    with open(f"images/{img['file_name']}", "wb") as f:
        f.write(r.content)
    print(f"Downloaded: {img['file_name']}")
```

---

## 8. API Reference

### POST `/api/projects/:id/export/coco`

Export project dưới dạng COCO ZIP với train/val/test split.

**Auth:** Bearer Token (MANAGER hoặc ADMIN)

**Request body:**
```json
{
  "trainRatio": 0.7,
  "valRatio": 0.2,
  "testRatio": 0.1
}
```

| Field | Type | Required | Default | Constraint |
|-------|------|----------|---------|------------|
| `trainRatio` | float | No | `0.7` | `trainRatio + valRatio + testRatio = 1` |
| `valRatio` | float | No | `0.2` | |
| `testRatio` | float | No | `0.1` | |

**Response:**
- `200 OK`: Binary ZIP file (`application/zip`)
- `400 Bad Request`: Tỉ lệ không hợp lệ
- `403 Forbidden`: Không đủ quyền
- `404 Not Found`: Project không tồn tại
- `500 Internal Server Error`: Lỗi server

**Response Headers:**
```
Content-Type: application/zip
Content-Disposition: attachment; filename="Export_ProjectName-coco.zip"
X-Export-Stats: {"total":100,"trainCount":70,"valCount":20,"testCount":10}
```

---

## 9. File liên quan trong codebase

| File | Vai trò |
|------|---------|
| `server/src/services/export.service.ts` | Logic chính: query DB, build COCO JSON, split dataset |
| `server/src/controllers/export.controller.ts` | HTTP handler, tạo ZIP bằng JSZip |
| `server/src/routes/project.routes.ts` | Route `POST /:id/export/coco` |
| `client/src/services/project.api.ts` | `exportCOCO()` — gọi API + trigger download |
| `client/src/features/manager/components/ExportDialog.tsx` | UI dialog chọn tỉ lệ split |
| `client/src/features/manager/pages/ProjectDetailPage.tsx` | Nút "Export COCO" + tích hợp dialog |
