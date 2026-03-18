import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import { EmailService } from './email/email.service.js';
import { SystemConfigService } from './system.config.service.js';

// Use a derived secret for OTP tokens (separate from main JWT secret)
const OTP_SECRET = config.JWT_SECRET + ':otp';

interface OtpTokenPayload {
  sub: string;
  email: string;
  otpHash: string;
  purpose: 'otp_verify';
}

export class OtpService {
  private static emailService = new EmailService();

  /**
   * Generate a 6-digit OTP, hash it into a JWT temp token, and send via email
   * Returns the signed temp token (stateless — no DB storage)
   */
  static async generateOtp(userId: string, email: string): Promise<string> {
    const otpConfig = await SystemConfigService.getOtpConfig();

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash OTP with HMAC-SHA256
    const otpHash = crypto
      .createHmac('sha256', OTP_SECRET)
      .update(otp)
      .digest('hex');

    // Create a short-lived JWT containing the hashed OTP
    const otpToken = jwt.sign(
      {
        sub: userId,
        email,
        otpHash,
        purpose: 'otp_verify',
      } as OtpTokenPayload,
      OTP_SECRET,
      { expiresIn: `${otpConfig.expirationMinutes}m` }
    );

    // Send OTP via email
    try {
      await this.emailService.sendEmail({
        to: email,
        templateType: 'LOGIN_OTP',
        variables: {
          otpCode: otp,
          expirationMinutes: otpConfig.expirationMinutes.toString(),
          userName: email.split('@')[0],
        },
      });
    } catch (emailError) {
      // If template not found, send with inline HTML
      console.warn('[OTP] Template not found, using inline email');
      await this.emailService.sendEmail({
        to: email,
        subject: 'V-Label Login OTP Verification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #0ea5e9; margin-bottom: 16px;">Login Verification</h2>
            <p>Your OTP code is:</p>
            <div style="background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0369a1;">${otp}</span>
            </div>
            <p style="color: #64748b; font-size: 14px;">
              This code will expire in <strong>${otpConfig.expirationMinutes} minutes</strong>.
              If you did not request this, please ignore this email.
            </p>
          </div>
        `,
      });
    }

    console.log(`[OTP] Sent OTP to ${email}`);
    return otpToken;
  }

  /**
   * Verify an OTP code against the temp token (stateless verification)
   * Returns userId if valid, throws if invalid
   */
  static verifyOtp(otpToken: string, code: string): { userId: string; email: string } {
    // Decode and verify the temp token
    let payload: OtpTokenPayload;
    try {
      payload = jwt.verify(otpToken, OTP_SECRET) as OtpTokenPayload;
    } catch (error: any) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('OTP has expired. Please login again to get a new code.');
      }
      throw new Error('Invalid OTP token.');
    }

    // Verify purpose
    if (payload.purpose !== 'otp_verify') {
      throw new Error('Invalid OTP token.');
    }

    // Hash the provided code and compare
    const codeHash = crypto
      .createHmac('sha256', OTP_SECRET)
      .update(code)
      .digest('hex');

    if (codeHash !== payload.otpHash) {
      throw new Error('Invalid OTP code.');
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
