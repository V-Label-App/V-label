# Hướng Dẫn Thêm API vào Swagger Documentation

**Mục đích**: Tài liệu này hướng dẫn các developer cách thêm documentation cho API endpoints mới vào Swagger UI.

---

## 📋 Mục Lục

1. [Giới thiệu](#giới-thiệu)
2. [Cấu trúc cơ bản](#cấu-trúc-cơ-bản)
3. [Tạo Schema Definition](#tạo-schema-definition)
4. [Document Controller Endpoint](#document-controller-endpoint)
5. [Ví dụ thực tế](#ví-dụ-thực-tế)
6. [Best Practices](#best-practices)

---

## Giới thiệu

Swagger documentation được tự động generate từ **JSDoc comments** trong code. Khi bạn thêm annotation đúng format, endpoint sẽ tự động xuất hiện trong Swagger UI tại `/api-docs`.

### Kiểm tra Swagger UI

```bash
# 1. Đảm bảo SWAGGER_ENABLED=true trong file .env
echo "SWAGGER_ENABLED=true" >> .env

# 2. Chạy server
npm run dev

# 3. Mở browser
# http://localhost:4000/api-docs
```

---

## Cấu trúc cơ bản

### 1. Tạo Schema Definition (Tùy chọn nhưng nên làm)

**Vị trí**: `server/src/docs/schemas/`

Tạo file schema mới cho domain của bạn, ví dụ `project.schemas.ts`:

```typescript
/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         name:
 *           type: string
 *           example: "My Project"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Project description"
 *         status:
 *           type: string
 *           enum: [ACTIVE, COMPLETED, ARCHIVED]
 *           example: "ACTIVE"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2024-01-01T00:00:00.000Z"
 *
 *     CreateProjectRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 3
 *           example: "New Project"
 *         description:
 *           type: string
 *           example: "Optional description"
 */

export {};
```

**Lưu ý quan trọng**:
- Phải có `export {};` ở cuối file để TypeScript nhận diện đây là module
- Sử dụng `$ref` để tái sử dụng schema: `$ref: '#/components/schemas/Project'`

---

## Document Controller Endpoint

### Cú pháp cơ bản

Thêm JSDoc comment **ngay trước** method trong controller:

```typescript
export class ProjectController {
  /**
   * @swagger
   * /api/v1/projects:
   *   get:
   *     summary: Lấy danh sách tất cả projects
   *     tags: [Projects]
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           default: 1
   *         description: Số trang
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           default: 20
   *         description: Số items mỗi trang
   *     responses:
   *       200:
   *         description: Lấy danh sách thành công
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Project'
   *                 meta:
   *                   $ref: '#/components/schemas/PaginationMeta'
   *       401:
   *         $ref: '#/components/responses/UnauthorizedError'
   *       500:
   *         $ref: '#/components/responses/ServerError'
   *     security:
   *       - bearerAuth: []
   */
  static async getProjects(req: Request, res: Response) {
    // Implementation
  }
}
```

---

## Ví dụ thực tế

### Ví dụ 1: GET endpoint đơn giản (Public)

```typescript
/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: Kiểm tra trạng thái server
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server đang hoạt động
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 */
static async healthCheck(req: Request, res: Response) {
  res.json({ status: 'ok' });
}
```

### Ví dụ 2: POST endpoint với authentication

```typescript
/**
 * @swagger
 * /api/v1/projects:
 *   post:
 *     summary: Tạo project mới
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProjectRequest'
 *     responses:
 *       201:
 *         description: Tạo project thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
static async createProject(req: Request, res: Response) {
  // Implementation
}
```

### Ví dụ 3: PUT endpoint với path parameter

```typescript
/**
 * @swagger
 * /api/v1/projects/{id}:
 *   put:
 *     summary: Cập nhật project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProjectRequest'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Project'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
static async updateProject(req: Request, res: Response) {
  // Implementation
}
```

### Ví dụ 4: DELETE endpoint

```typescript
/**
 * @swagger
 * /api/v1/projects/{id}:
 *   delete:
 *     summary: Xóa project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Project ID
 *     responses:
 *       204:
 *         description: Xóa thành công (No Content)
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
static async deleteProject(req: Request, res: Response) {
  // Implementation
}
```

---

## Best Practices

### ✅ Nên làm

1. **Sử dụng tags để nhóm endpoints**
   ```typescript
   tags: [Projects]  // Tất cả project endpoints dùng tag này
   ```

2. **Tái sử dụng schemas**
   ```typescript
   $ref: '#/components/schemas/Project'
   ```

3. **Document tất cả response codes**
   - 200/201: Success
   - 400: Validation error
   - 401: Unauthorized
   - 403: Forbidden
   - 404: Not found
   - 500: Server error

4. **Thêm examples cho clarity**
   ```typescript
   example: "user@example.com"
   ```

5. **Đánh dấu required fields**
   ```typescript
   required:
     - email
     - password
   ```

6. **Sử dụng security cho protected endpoints**
   ```typescript
   security:
     - bearerAuth: []
   ```

### ❌ Không nên làm

1. ❌ Không document endpoint trong route file (chỉ document trong controller)
2. ❌ Không copy-paste toàn bộ schema inline (dùng `$ref`)
3. ❌ Không quên thêm `export {};` ở cuối schema file
4. ❌ Không để thiếu response codes quan trọng

---

## Các Schema có sẵn

Bạn có thể tái sử dụng các schema đã được định nghĩa:

### Common Schemas
- `ErrorResponse` - Lỗi chuẩn
- `SuccessResponse` - Response thành công
- `PaginationMeta` - Metadata phân trang

### Auth Schemas
- `User` - User entity
- `LoginRequest` - Email + password
- `LoginResponse` - User + tokens
- `RegisterRequest` - Đăng ký user mới

### Common Responses
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `NotFoundError` (404)
- `ValidationError` (400)
- `ServerError` (500)

**Cách dùng**:
```typescript
responses:
  401:
    $ref: '#/components/responses/UnauthorizedError'
```

---

## Kiểm tra kết quả

1. **Lưu file** - Nodemon sẽ tự động restart server
2. **Mở Swagger UI**: http://localhost:4000/api-docs
3. **Tìm endpoint** của bạn trong tag tương ứng
4. **Test "Try it out"** để đảm bảo hoạt động đúng

---

## Troubleshooting

### Endpoint không xuất hiện trong Swagger UI?

1. ✅ Kiểm tra `SWAGGER_ENABLED=true` trong `.env`
2. ✅ Đảm bảo JSDoc comment có `@swagger` tag
3. ✅ Kiểm tra syntax YAML trong comment (indentation rất quan trọng!)
4. ✅ Restart server nếu cần
5. ✅ Kiểm tra console log có lỗi không

### Schema không tìm thấy?

1. ✅ Đảm bảo file schema có `export {};`
2. ✅ Kiểm tra path trong `swagger.config.ts` có include folder schemas không
3. ✅ Sử dụng đúng format: `$ref: '#/components/schemas/SchemaName'`

---

## Tham khảo

- **OpenAPI 3.0 Spec**: https://swagger.io/specification/
- **Swagger Editor**: https://editor.swagger.io/ (để test YAML syntax)
- **Ví dụ trong project**: `server/src/controllers/auth.controller.ts`

---

**Lưu ý**: Swagger chỉ enable trong development/staging. Production sẽ tự động disable để bảo mật.
