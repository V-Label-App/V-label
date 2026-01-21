# Forgot Password Implementation Plan

## Overview
Implement secure password reset functionality allowing users to reset their password via email verification.

## Implementation Steps

### Phase 1: Database Schema

#### 1. Update Prisma Schema
**File**: `server/prisma/schema.prisma`

Add new model:
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

Update User model to add relation:
```prisma
model User {
  // ... existing fields
  passwordResetTokens PasswordResetToken[]
}
```

Run migration:
```bash
npx prisma migrate dev --name add_password_reset_token
npx prisma generate
```

---

### Phase 2: Backend Implementation

#### 2. Email Service Setup

**File**: `server/src/services/email.service.ts` (NEW)

```typescript
import nodemailer from 'nodemailer';

export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to: email,
      subject: 'Reset Your VLabel Password',
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password for your VLabel account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="...">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });
  }
}
```

**Dependencies**: Add to `package.json`:
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

---

#### 3. Password Reset Service

**File**: `server/src/services/password-reset.service.ts` (NEW)

```typescript
import { prisma } from '../utils/database.js';
import { EmailService } from './email.service.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class PasswordResetService {
  private emailService = new EmailService();

  async requestPasswordReset(email: string) {
    // Find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    
    // Don't reveal if email exists (security)
    if (!user) {
      return { message: 'If email exists, reset link has been sent' };
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send email
    await this.emailService.sendPasswordResetEmail(user.email, token);

    return { message: 'If email exists, reset link has been sent' };
  }

  async verifyResetToken(token: string) {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      return { valid: false };
    }

    return { valid: true, email: resetToken.user.email };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new Error('Invalid or expired token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
      // Log to audit
      prisma.auditLog.create({
        data: {
          action: 'PASSWORD_RESET',
          actorId: resetToken.userId,
          targetId: null,
          metadata: { method: 'email_reset' },
        },
      }),
    ]);

    return { message: 'Password reset successful' };
  }
}
```

---

#### 4. Auth Controller Updates

**File**: `server/src/controllers/auth.controller.ts`

Add new methods:
```typescript
import { PasswordResetService } from '../services/password-reset.service.js';

export class AuthController {
  // ... existing methods

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const service = new PasswordResetService();
      const result = await service.requestPasswordReset(email);
      return res.json(result);
    } catch (error) {
      console.error('[Auth] Forgot password error:', error);
      return res.status(500).json({ error: 'Failed to process request' });
    }
  }

  static async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.params;
      const service = new PasswordResetService();
      const result = await service.verifyResetToken(token);
      return res.json(result);
    } catch (error) {
      console.error('[Auth] Verify token error:', error);
      return res.status(500).json({ error: 'Failed to verify token' });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      const service = new PasswordResetService();
      const result = await service.resetPassword(token, newPassword);
      return res.json(result);
    } catch (error: any) {
      console.error('[Auth] Reset password error:', error);
      return res.status(400).json({ error: error.message || 'Failed to reset password' });
    }
  }
}
```

---

#### 5. Auth Routes Updates

**File**: `server/src/routes/auth.routes.ts`

Add new routes:
```typescript
// Password reset routes
router.post('/forgot-password', AuthController.forgotPassword);
router.get('/verify-reset-token/:token', AuthController.verifyResetToken);
router.post('/reset-password', AuthController.resetPassword);
```

---

### Phase 3: Frontend Implementation

#### 6. API Client

**File**: `client/src/services/auth.api.ts`

Add methods:
```typescript
export const authApi = {
  // ... existing methods

  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyResetToken: async (token: string) => {
    const response = await apiClient.get(`/auth/verify-reset-token/${token}`);
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },
};
```

---

#### 7. Forgot Password Page

**File**: `client/src/features/auth/pages/ForgotPasswordPage.tsx` (NEW)

Create page with:
- Email input form
- Submit button
- Success/error messages
- Back to login link
- Similar styling to LoginPage

---

#### 8. Reset Password Page

**File**: `client/src/features/auth/pages/ResetPasswordPage.tsx` (NEW)

Create page with:
- Token validation on mount
- New password input
- Confirm password input
- Password strength indicator
- Submit button
- Redirect to login on success

---

#### 9. Router Updates

**File**: `client/src/App.tsx` or router config

Add routes:
```typescript
import { ForgotPasswordPage } from './features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';

// Add to routes
{ path: '/forgot-password', element: <ForgotPasswordPage /> }
{ path: '/reset-password', element: <ResetPasswordPage /> }
```

---

#### 10. Login Page Update

**File**: `client/src/features/auth/pages/LoginPage.tsx`

Add "Forgot Password?" link:
```tsx
<Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
  Forgot password?
</Link>
```

---

### Phase 4: Environment Configuration

#### 11. Environment Variables

**File**: `server/.env`

Add:
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

---

## Testing Checklist

- [ ] User can request password reset
- [ ] Email is sent with valid token
- [ ] Token link redirects to reset page
- [ ] Invalid token shows error
- [ ] Expired token shows error
- [ ] Password can be reset successfully
- [ ] Used token cannot be reused
- [ ] User can login with new password
- [ ] Audit log records reset event

---

## Security Notes

1. Tokens expire after 1 hour
2. Tokens are single-use only
3. Generic messages don't reveal email existence
4. All reset attempts are logged
5. Password requirements enforced

---

## Deployment Notes

1. Configure SMTP credentials in production
2. Update FRONTEND_URL for production domain
3. Consider using SendGrid/AWS SES for production email
4. Set up email monitoring/logging
