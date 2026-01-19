# Forgot Password Feature Specification

## Overview
Implement a secure password reset flow that allows users to reset their password via email verification.

## User Flow

### 1. Request Password Reset
- User clicks "Forgot Password?" link on login page
- User enters their email address
- System sends password reset email with a secure token
- User receives confirmation message

### 2. Reset Password
- User clicks the reset link in email
- User is redirected to reset password page with token
- User enters new password (with confirmation)
- System validates token and updates password
- User is redirected to login page

## Technical Requirements

### Backend

#### Database Schema
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

#### API Endpoints
1. **POST /auth/forgot-password**
   - Request body: `{ email: string }`
   - Validates email exists
   - Generates secure token (UUID or crypto random)
   - Stores token with expiration (1 hour)
   - Sends email with reset link
   - Response: `{ message: "Reset email sent" }`

2. **POST /auth/reset-password**
   - Request body: `{ token: string, newPassword: string }`
   - Validates token exists and not expired
   - Validates token not already used
   - Hashes new password
   - Updates user password
   - Marks token as used
   - Response: `{ message: "Password reset successful" }`

3. **GET /auth/verify-reset-token/:token**
   - Validates token exists and not expired
   - Response: `{ valid: boolean, email?: string }`

#### Email Service
- Use existing email service or integrate new one (Nodemailer, SendGrid, etc.)
- Email template with:
  - Reset link: `${FRONTEND_URL}/reset-password?token=${token}`
  - Expiration time (1 hour)
  - Security notice

### Frontend

#### Pages/Components
1. **ForgotPasswordPage** (`/forgot-password`)
   - Email input form
   - Submit button
   - Back to login link
   - Success/error messages

2. **ResetPasswordPage** (`/reset-password?token=xxx`)
   - Token validation on mount
   - New password input (with strength indicator)
   - Confirm password input
   - Submit button
   - Password requirements display

#### Routes
```typescript
// Add to router
{ path: '/forgot-password', element: <ForgotPasswordPage /> }
{ path: '/reset-password', element: <ResetPasswordPage /> }
```

## Security Considerations

1. **Token Security**
   - Use cryptographically secure random tokens
   - Tokens expire after 1 hour
   - Tokens are single-use only
   - Tokens are invalidated after password change

2. **Rate Limiting**
   - Limit password reset requests per email (e.g., 3 per hour)
   - Prevent brute force token guessing

3. **Email Validation**
   - Don't reveal if email exists in system (generic message)
   - Log all password reset attempts

4. **Password Requirements**
   - Minimum length (8 characters for production, 3 for dev)
   - Password strength validation

## Email Template

```html
Subject: Reset Your VLabel Password

Hi,

You requested to reset your password for your VLabel account.

Click the link below to reset your password:
[Reset Password Button/Link]

This link will expire in 1 hour.

If you didn't request this, please ignore this email.

Best regards,
VLabel Team
```

## Environment Variables

```env
# Email Service (choose one)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# OR use SendGrid
SENDGRID_API_KEY=your-sendgrid-key

# Frontend URL for reset link
FRONTEND_URL=http://localhost:5173
```

## Success Criteria

- [ ] User can request password reset via email
- [ ] Reset email is sent with valid token
- [ ] User can reset password using token
- [ ] Token expires after 1 hour
- [ ] Token can only be used once
- [ ] Invalid/expired tokens show appropriate error
- [ ] Password is successfully updated
- [ ] User can login with new password
- [ ] Audit log records password reset events
