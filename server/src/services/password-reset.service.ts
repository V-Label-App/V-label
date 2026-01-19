import { prisma } from '../utils/database.js';
import { EmailService } from './email/email.service.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export class PasswordResetService {
  private emailService = new EmailService();

  /**
   * Request password reset - generates token and sends email
   */
  async requestPasswordReset(email: string) {
    // Find user by email
    const user = await prisma.user.findUnique({ 
      where: { email } 
    });
    
    // Don't reveal if email exists (security best practice)
    if (!user) {
      console.log(`[PasswordReset] Email not found: ${email}`);
      return { message: 'If your email exists in our system, you will receive a password reset link' };
    }

    // Generate secure token (64 characters)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store token in database
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // Send reset email
    try {
      await this.emailService.sendEmail({
        to: user.email,
        templateType: 'PASSWORD_RESET',
        variables: {
          userName: user.fullName || user.email.split('@')[0],
          resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
          expirationTime: '1 hour',
        },
      });

      console.log(`[PasswordReset] Reset email sent to: ${email}`);
    } catch (error) {
      console.error('[PasswordReset] Failed to send email:', error);
      // Delete the token if email failed
      await prisma.passwordResetToken.deleteMany({
        where: { token }
      });
      throw new Error('Failed to send reset email. Please try again later.');
    }

    return { message: 'If your email exists in our system, you will receive a password reset link' };
  }

  /**
   * Verify if reset token is valid
   */
  async verifyResetToken(token: string) {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      return { valid: false, error: 'Invalid token' };
    }

    if (resetToken.used) {
      return { valid: false, error: 'Token has already been used' };
    }

    if (resetToken.expiresAt < new Date()) {
      return { valid: false, error: 'Token has expired' };
    }

    return { 
      valid: true, 
      email: resetToken.user.email,
      userId: resetToken.user.id,
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string) {
    // Verify token first
    const verification = await this.verifyResetToken(token);
    
    if (!verification.valid) {
      throw new Error(verification.error || 'Invalid or expired token');
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new Error('Token not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and mark token as used in a transaction
    await prisma.$transaction([
      // Update user password
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword },
      }),
      // Mark token as used
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
          metadata: {
            method: 'email_reset',
            timestamp: new Date().toISOString(),
          },
        },
      }),
    ]);

    console.log(`[PasswordReset] Password reset successful for user: ${resetToken.user.email}`);

    return { message: 'Password reset successful. You can now login with your new password.' };
  }

  /**
   * Clean up expired tokens (can be run as a cron job)
   */
  async cleanupExpiredTokens() {
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { used: true },
        ],
      },
    });

    console.log(`[PasswordReset] Cleaned up ${result.count} expired/used tokens`);
    return result;
  }
}
