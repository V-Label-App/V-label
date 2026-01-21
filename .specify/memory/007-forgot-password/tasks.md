# Forgot Password Feature - Implementation Tasks

## 🎯 Overview
Implement secure password reset functionality with email verification.

---

## ✅ Phase 1: Database Schema & Migration

### 1.1 Update Prisma Schema
- [ ] Open `server/prisma/schema.prisma`
- [ ] Add `PasswordResetToken` model:
  ```prisma
  model PasswordResetToken {
    id        String   @id @default(uuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    token     String   @unique
    expiresAt DateTime
    used      Boolean  @default(false)
    createdAt DateTime @default(now())
    
    @@index([userId])
    @@index([token])
  }
  ```
- [ ] Update `User` model to add relation:
  ```prisma
  passwordResetTokens PasswordResetToken[]
  ```

### 1.2 Run Database Migration
- [ ] Run: `cd server && npx prisma migrate dev --name add_password_reset_token`
- [ ] Run: `npx prisma generate`
- [ ] Verify migration in database

---

## 📧 Phase 2: Email Service

### 2.1 Install Dependencies
- [ ] Run: `cd server && npm install nodemailer`
- [ ] Run: `npm install -D @types/nodemailer`

### 2.2 Create Email Service
- [ ] Create file: `server/src/services/email.service.ts`
- [ ] Implement `EmailService` class with:
  - [ ] Constructor with nodemailer transporter
  - [ ] `sendPasswordResetEmail(email, token)` method
  - [ ] HTML email template with reset link
  - [ ] Error handling

### 2.3 Configure Environment
- [ ] Add to `server/.env`:
  ```env
  SMTP_HOST=smtp.gmail.com
  SMTP_PORT=587
  SMTP_USER=your-email@gmail.com
  SMTP_PASS=your-app-password
  FRONTEND_URL=http://localhost:5173
  ```
- [ ] Test email sending locally (optional test script)

---

## 🔐 Phase 3: Password Reset Service

### 3.1 Create Password Reset Service
- [ ] Create file: `server/src/services/password-reset.service.ts`
- [ ] Import dependencies: `prisma`, `EmailService`, `crypto`, `bcrypt`

### 3.2 Implement `requestPasswordReset` Method
- [ ] Find user by email
- [ ] Generate secure token using `crypto.randomBytes(32).toString('hex')`
- [ ] Set expiration to 1 hour from now
- [ ] Create `PasswordResetToken` record in database
- [ ] Call `emailService.sendPasswordResetEmail()`
- [ ] Return generic success message (don't reveal if email exists)
- [ ] Add error handling

### 3.3 Implement `verifyResetToken` Method
- [ ] Find token in database with user relation
- [ ] Check if token exists
- [ ] Check if token is not used
- [ ] Check if token is not expired
- [ ] Return `{ valid: boolean, email?: string }`

### 3.4 Implement `resetPassword` Method
- [ ] Find and validate token (same checks as verify)
- [ ] Hash new password with bcrypt
- [ ] Use Prisma transaction to:
  - [ ] Update user password
  - [ ] Mark token as used
  - [ ] Create audit log entry with action `PASSWORD_RESET`
- [ ] Return success message
- [ ] Add error handling for invalid/expired tokens

---

## 🛣️ Phase 4: API Routes & Controllers

### 4.1 Update Auth Controller
- [ ] Open `server/src/controllers/auth.controller.ts`
- [ ] Import `PasswordResetService`

### 4.2 Add `forgotPassword` Method
- [ ] Extract `email` from request body
- [ ] Validate email format
- [ ] Call `passwordResetService.requestPasswordReset(email)`
- [ ] Return JSON response
- [ ] Add try-catch error handling

### 4.3 Add `verifyResetToken` Method
- [ ] Extract `token` from request params
- [ ] Call `passwordResetService.verifyResetToken(token)`
- [ ] Return JSON response
- [ ] Add error handling

### 4.4 Add `resetPassword` Method
- [ ] Extract `token` and `newPassword` from request body
- [ ] Validate password (min 3 chars for dev, 8 for prod)
- [ ] Call `passwordResetService.resetPassword(token, newPassword)`
- [ ] Return JSON response
- [ ] Add error handling (400 for validation, 500 for server errors)

### 4.5 Update Auth Routes
- [ ] Open `server/src/routes/auth.routes.ts`
- [ ] Add route: `router.post('/forgot-password', AuthController.forgotPassword)`
- [ ] Add route: `router.get('/verify-reset-token/:token', AuthController.verifyResetToken)`
- [ ] Add route: `router.post('/reset-password', AuthController.resetPassword)`

---

## 💻 Phase 5: Frontend API Client

### 5.1 Update Auth API Service
- [ ] Open `client/src/services/auth.api.ts`

### 5.2 Add API Methods
- [ ] Add `forgotPassword` method:
  ```typescript
  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  }
  ```
- [ ] Add `verifyResetToken` method:
  ```typescript
  verifyResetToken: async (token: string) => {
    const response = await apiClient.get(`/auth/verify-reset-token/${token}`);
    return response.data;
  }
  ```
- [ ] Add `resetPassword` method:
  ```typescript
  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
  }
  ```

---

## 📄 Phase 6: Forgot Password Page

### 6.1 Create Forgot Password Page
- [ ] Create file: `client/src/features/auth/pages/ForgotPasswordPage.tsx`
- [ ] Import dependencies: `useState`, `useNavigate`, `Button`, `Input`, `toast`, etc.

### 6.2 Implement Page UI
- [ ] Add page layout (similar to LoginPage)
- [ ] Add VLabel logo
- [ ] Add page title: "Reset Your Password"
- [ ] Add description text
- [ ] Add email input field with validation
- [ ] Add submit button with loading state
- [ ] Add "Back to Login" link
- [ ] Add success/error message display

### 6.3 Implement Form Logic
- [ ] Add `email` state
- [ ] Add `isLoading` state
- [ ] Add `submitted` state (to show success message)
- [ ] Implement `handleSubmit` function:
  - [ ] Validate email format
  - [ ] Call `authApi.forgotPassword(email)`
  - [ ] Show success toast
  - [ ] Set `submitted` to true to show confirmation message
  - [ ] Handle errors with toast

### 6.4 Style Page
- [ ] Match LoginPage styling
- [ ] Add animations (framer-motion)
- [ ] Ensure responsive design
- [ ] Add VLabel logo image

---

## 🔑 Phase 7: Reset Password Page

### 7.1 Create Reset Password Page
- [ ] Create file: `client/src/features/auth/pages/ResetPasswordPage.tsx`
- [ ] Import dependencies: `useState`, `useEffect`, `useNavigate`, `useSearchParams`, etc.

### 7.2 Implement Token Validation
- [ ] Extract token from URL query params
- [ ] Add `useEffect` to validate token on mount
- [ ] Call `authApi.verifyResetToken(token)`
- [ ] Show loading state during validation
- [ ] Show error if token is invalid/expired
- [ ] Store user email from validation response

### 7.3 Implement Page UI
- [ ] Add page layout (similar to LoginPage)
- [ ] Add VLabel logo
- [ ] Add page title: "Set New Password"
- [ ] Show user email (from token validation)
- [ ] Add new password input with show/hide toggle
- [ ] Add confirm password input
- [ ] Add password strength indicator
- [ ] Add password requirements list
- [ ] Add submit button with loading state
- [ ] Add error message display

### 7.4 Implement Form Logic
- [ ] Add `newPassword` state
- [ ] Add `confirmPassword` state
- [ ] Add `isLoading` state
- [ ] Add password validation:
  - [ ] Check minimum length (3 chars)
  - [ ] Check passwords match
- [ ] Implement `handleSubmit` function:
  - [ ] Validate passwords
  - [ ] Call `authApi.resetPassword(token, newPassword)`
  - [ ] Show success toast
  - [ ] Redirect to `/login` after 2 seconds
  - [ ] Handle errors with toast

### 7.5 Style Page
- [ ] Match LoginPage styling
- [ ] Add animations
- [ ] Ensure responsive design
- [ ] Add VLabel logo image

---

## 🧭 Phase 8: Router Integration

### 8.1 Add Routes
- [ ] Open router configuration file (e.g., `client/src/App.tsx`)
- [ ] Import `ForgotPasswordPage`
- [ ] Import `ResetPasswordPage`
- [ ] Add route: `{ path: '/forgot-password', element: <ForgotPasswordPage /> }`
- [ ] Add route: `{ path: '/reset-password', element: <ResetPasswordPage /> }`

### 8.2 Update Login Page
- [ ] Open `client/src/features/auth/pages/LoginPage.tsx`
- [ ] Add "Forgot Password?" link below password input:
  ```tsx
  <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
    Forgot password?
  </Link>
  ```

---

## 🧪 Phase 9: Testing

### 9.1 Backend Testing
- [ ] Test `POST /auth/forgot-password` with valid email
- [ ] Test `POST /auth/forgot-password` with invalid email
- [ ] Test email is sent successfully
- [ ] Test token is created in database
- [ ] Test `GET /auth/verify-reset-token/:token` with valid token
- [ ] Test `GET /auth/verify-reset-token/:token` with invalid token
- [ ] Test `GET /auth/verify-reset-token/:token` with expired token
- [ ] Test `POST /auth/reset-password` with valid token
- [ ] Test `POST /auth/reset-password` with used token
- [ ] Test password is updated in database
- [ ] Test token is marked as used
- [ ] Test audit log entry is created

### 9.2 Frontend Testing
- [ ] Test Forgot Password page loads
- [ ] Test email validation
- [ ] Test form submission
- [ ] Test success message display
- [ ] Test "Back to Login" link
- [ ] Test Reset Password page loads with token
- [ ] Test token validation on mount
- [ ] Test invalid token error display
- [ ] Test password validation
- [ ] Test password match validation
- [ ] Test form submission
- [ ] Test redirect to login after success

### 9.3 End-to-End Testing
- [ ] Complete full flow: Request → Email → Reset → Login
- [ ] Test with Gmail account
- [ ] Test token expiration (wait 1 hour or modify expiration for testing)
- [ ] Test token reuse prevention
- [ ] Test with different browsers
- [ ] Test on mobile devices

---

## 🔒 Phase 10: Security Review

### 10.1 Token Security
- [ ] Verify tokens use `crypto.randomBytes` (cryptographically secure)
- [ ] Verify token length is 64 characters (32 bytes hex)
- [ ] Verify tokens are stored hashed (if needed) or as-is with unique constraint
- [ ] Verify token expiration is enforced
- [ ] Verify tokens are single-use

### 10.2 Email Security
- [ ] Verify generic error messages (don't reveal email existence)
- [ ] Verify email content doesn't expose sensitive info
- [ ] Verify reset link uses HTTPS in production

### 10.3 Password Security
- [ ] Verify password is hashed with bcrypt
- [ ] Verify password requirements are enforced
- [ ] Verify old password is not reused (optional)

### 10.4 Audit Logging
- [ ] Verify all password reset attempts are logged
- [ ] Verify audit log includes timestamp and user ID
- [ ] Review audit log entries in database

---

## 📚 Phase 11: Documentation

### 11.1 API Documentation
- [ ] Document `POST /auth/forgot-password` endpoint
- [ ] Document `GET /auth/verify-reset-token/:token` endpoint
- [ ] Document `POST /auth/reset-password` endpoint
- [ ] Add request/response examples
- [ ] Add error codes and messages

### 11.2 Environment Documentation
- [ ] Document SMTP configuration variables
- [ ] Document FRONTEND_URL variable
- [ ] Add setup instructions for Gmail App Password
- [ ] Add alternative email provider options (SendGrid, AWS SES)

### 11.3 User Guide
- [ ] Add "Forgot Password" section to user documentation
- [ ] Include screenshots of pages
- [ ] Document troubleshooting steps

---

## 🚀 Phase 12: Deployment Preparation

### 12.1 Production Configuration
- [ ] Update SMTP credentials for production
- [ ] Update FRONTEND_URL to production domain
- [ ] Consider using SendGrid or AWS SES for production email
- [ ] Set up email monitoring/logging

### 12.2 Final Checks
- [ ] Review all code changes
- [ ] Run linter and fix issues
- [ ] Run tests
- [ ] Update CHANGELOG
- [ ] Create pull request

---

## 📝 Notes

### Token Configuration
- **Expiration**: 1 hour (3600000 ms)
- **Length**: 64 characters (32 bytes hex)
- **Single-use**: Yes, marked as `used` after password reset

### Password Requirements
- **Development**: Minimum 3 characters
- **Production**: Minimum 8 characters
- **Validation**: Client-side and server-side

### Email Provider
- **Default**: Gmail SMTP
- **Alternatives**: SendGrid, AWS SES, Mailgun
- **Rate Limiting**: Consider implementing (e.g., 3 requests per hour per email)

### Security Best Practices
- ✅ Cryptographically secure tokens
- ✅ Token expiration
- ✅ Single-use tokens
- ✅ Generic error messages
- ✅ Audit logging
- ✅ HTTPS in production
