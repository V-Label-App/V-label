# Email Service Architecture - Extensible & Admin Configurable

## Overview
Design a flexible email service that supports multiple email types and allows admin configuration of email templates and settings.

---

## Database Schema

### EmailTemplate Model
```prisma
model EmailTemplate {
  id          String   @id @default(uuid())
  type        String   @unique // 'PASSWORD_RESET', 'WELCOME', 'NOTIFICATION', etc.
  subject     String
  htmlBody    String   @db.Text
  textBody    String?  @db.Text
  variables   Json     // Available variables for this template
  enabled     Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([type])
}

model EmailConfig {
  id        String   @id @default(uuid())
  key       String   @unique // 'smtp', 'sendgrid', 'aws_ses'
  provider  String   // 'smtp', 'sendgrid', 'aws_ses'
  config    Json     // Provider-specific config
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model EmailLog {
  id          String   @id @default(uuid())
  to          String
  from        String
  subject     String
  templateType String?
  status      String   // 'sent', 'failed', 'pending'
  error       String?  @db.Text
  sentAt      DateTime?
  createdAt   DateTime @default(now())
  
  @@index([to])
  @@index([status])
  @@index([createdAt])
}
```

---

## Email Service Architecture

### Core Email Service
**File**: `server/src/services/email/email.service.ts`

```typescript
import nodemailer from 'nodemailer';
import { prisma } from '../../utils/database.js';

export interface EmailOptions {
  to: string | string[];
  subject?: string; // Optional if using template
  html?: string;
  text?: string;
  templateType?: string; // Use template from DB
  variables?: Record<string, any>; // Variables for template
}

export class EmailService {
  private transporter: any;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on active config
   */
  private async initializeTransporter() {
    const activeConfig = await prisma.emailConfig.findFirst({
      where: { isActive: true }
    });

    if (!activeConfig) {
      // Fallback to env variables
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      return;
    }

    // Initialize based on provider
    switch (activeConfig.provider) {
      case 'smtp':
        this.transporter = nodemailer.createTransporter(activeConfig.config);
        break;
      case 'sendgrid':
        // SendGrid implementation
        break;
      case 'aws_ses':
        // AWS SES implementation
        break;
    }
  }

  /**
   * Send email with template or raw content
   */
  async sendEmail(options: EmailOptions): Promise<void> {
    try {
      let subject = options.subject;
      let html = options.html;
      let text = options.text;

      // If using template, fetch and render it
      if (options.templateType) {
        const template = await this.getTemplate(options.templateType);
        if (!template) {
          throw new Error(`Template ${options.templateType} not found`);
        }

        subject = this.renderTemplate(template.subject, options.variables || {});
        html = this.renderTemplate(template.htmlBody, options.variables || {});
        text = template.textBody ? this.renderTemplate(template.textBody, options.variables || {}) : undefined;
      }

      // Send email
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject,
        html,
        text,
      });

      // Log success
      await this.logEmail({
        to: Array.isArray(options.to) ? options.to[0] : options.to,
        from: process.env.SMTP_USER || '',
        subject: subject || '',
        templateType: options.templateType,
        status: 'sent',
        sentAt: new Date(),
      });

      console.log('[Email] Sent successfully:', result.messageId);
    } catch (error: any) {
      console.error('[Email] Send failed:', error);
      
      // Log failure
      await this.logEmail({
        to: Array.isArray(options.to) ? options.to[0] : options.to,
        from: process.env.SMTP_USER || '',
        subject: options.subject || options.templateType || '',
        templateType: options.templateType,
        status: 'failed',
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Get email template from database
   */
  private async getTemplate(type: string) {
    return await prisma.emailTemplate.findUnique({
      where: { type, enabled: true }
    });
  }

  /**
   * Render template with variables
   * Simple {{variable}} replacement
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      rendered = rendered.replace(regex, variables[key]);
    });

    return rendered;
  }

  /**
   * Log email to database
   */
  private async logEmail(data: {
    to: string;
    from: string;
    subject: string;
    templateType?: string;
    status: string;
    error?: string;
    sentAt?: Date;
  }) {
    await prisma.emailLog.create({ data });
  }
}
```

---

## Email Templates

### Template Manager Service
**File**: `server/src/services/email/template.service.ts`

```typescript
import { prisma } from '../../utils/database.js';

export class EmailTemplateService {
  /**
   * Get all email templates
   */
  async getAllTemplates() {
    return await prisma.emailTemplate.findMany({
      orderBy: { type: 'asc' }
    });
  }

  /**
   * Get template by type
   */
  async getTemplate(type: string) {
    return await prisma.emailTemplate.findUnique({
      where: { type }
    });
  }

  /**
   * Create or update template
   */
  async upsertTemplate(data: {
    type: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    variables: string[];
    enabled?: boolean;
  }) {
    return await prisma.emailTemplate.upsert({
      where: { type: data.type },
      create: {
        type: data.type,
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        variables: data.variables,
        enabled: data.enabled ?? true,
      },
      update: {
        subject: data.subject,
        htmlBody: data.htmlBody,
        textBody: data.textBody,
        variables: data.variables,
        enabled: data.enabled,
      },
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(type: string) {
    return await prisma.emailTemplate.delete({
      where: { type }
    });
  }

  /**
   * Seed default templates
   */
  async seedDefaultTemplates() {
    const defaults = [
      {
        type: 'PASSWORD_RESET',
        subject: 'Reset Your VLabel Password',
        htmlBody: `
          <h2>Password Reset Request</h2>
          <p>Hi {{userName}},</p>
          <p>You requested to reset your password for your VLabel account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="{{resetUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
          <p>This link will expire in {{expirationTime}}.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <p>Best regards,<br>VLabel Team</p>
        `,
        variables: ['userName', 'resetUrl', 'expirationTime'],
      },
      {
        type: 'WELCOME',
        subject: 'Welcome to VLabel!',
        htmlBody: `
          <h2>Welcome to VLabel!</h2>
          <p>Hi {{userName}},</p>
          <p>Thank you for joining VLabel. We're excited to have you on board!</p>
          <p>Your account has been created with the role: <strong>{{userRole}}</strong></p>
          <p>Get started by logging in:</p>
          <a href="{{loginUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Login Now</a>
          <p>Best regards,<br>VLabel Team</p>
        `,
        variables: ['userName', 'userRole', 'loginUrl'],
      },
      {
        type: 'TASK_ASSIGNED',
        subject: 'New Task Assigned - {{projectName}}',
        htmlBody: `
          <h2>New Task Assigned</h2>
          <p>Hi {{userName}},</p>
          <p>You have been assigned a new annotation task:</p>
          <ul>
            <li><strong>Project:</strong> {{projectName}}</li>
            <li><strong>Task ID:</strong> {{taskId}}</li>
            <li><strong>Deadline:</strong> {{deadline}}</li>
          </ul>
          <a href="{{taskUrl}}" style="display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">View Task</a>
          <p>Best regards,<br>VLabel Team</p>
        `,
        variables: ['userName', 'projectName', 'taskId', 'deadline', 'taskUrl'],
      },
    ];

    for (const template of defaults) {
      await this.upsertTemplate(template);
    }
  }
}
```

---

## Admin API Endpoints

### Email Admin Controller
**File**: `server/src/controllers/email-admin.controller.ts`

```typescript
import { Request, Response } from 'express';
import { EmailTemplateService } from '../services/email/template.service.js';
import { EmailService } from '../services/email/email.service.js';

export class EmailAdminController {
  /**
   * GET /admin/email/templates
   */
  static async getTemplates(req: Request, res: Response) {
    try {
      const service = new EmailTemplateService();
      const templates = await service.getAllTemplates();
      return res.json(templates);
    } catch (error) {
      console.error('[EmailAdmin] Get templates error:', error);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }
  }

  /**
   * GET /admin/email/templates/:type
   */
  static async getTemplate(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const service = new EmailTemplateService();
      const template = await service.getTemplate(type);
      
      if (!template) {
        return res.status(404).json({ error: 'Template not found' });
      }
      
      return res.json(template);
    } catch (error) {
      console.error('[EmailAdmin] Get template error:', error);
      return res.status(500).json({ error: 'Failed to fetch template' });
    }
  }

  /**
   * PUT /admin/email/templates/:type
   */
  static async updateTemplate(req: Request, res: Response) {
    try {
      const { type } = req.params;
      const { subject, htmlBody, textBody, variables, enabled } = req.body;
      
      const service = new EmailTemplateService();
      const template = await service.upsertTemplate({
        type,
        subject,
        htmlBody,
        textBody,
        variables,
        enabled,
      });
      
      return res.json(template);
    } catch (error) {
      console.error('[EmailAdmin] Update template error:', error);
      return res.status(500).json({ error: 'Failed to update template' });
    }
  }

  /**
   * POST /admin/email/test
   */
  static async sendTestEmail(req: Request, res: Response) {
    try {
      const { to, templateType, variables } = req.body;
      
      const emailService = new EmailService();
      await emailService.sendEmail({
        to,
        templateType,
        variables,
      });
      
      return res.json({ message: 'Test email sent successfully' });
    } catch (error: any) {
      console.error('[EmailAdmin] Send test email error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * GET /admin/email/logs
   */
  static async getEmailLogs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query;
      
      const logs = await prisma.emailLog.findMany({
        take: Number(limit),
        skip: (Number(page) - 1) * Number(limit),
        orderBy: { createdAt: 'desc' },
      });
      
      const total = await prisma.emailLog.count();
      
      return res.json({
        logs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('[EmailAdmin] Get logs error:', error);
      return res.status(500).json({ error: 'Failed to fetch email logs' });
    }
  }
}
```

---

## Usage Examples

### Password Reset Email
```typescript
const emailService = new EmailService();

await emailService.sendEmail({
  to: user.email,
  templateType: 'PASSWORD_RESET',
  variables: {
    userName: user.name || user.email,
    resetUrl: `${process.env.FRONTEND_URL}/reset-password?token=${token}`,
    expirationTime: '1 hour',
  },
});
```

### Welcome Email
```typescript
await emailService.sendEmail({
  to: newUser.email,
  templateType: 'WELCOME',
  variables: {
    userName: newUser.name,
    userRole: newUser.role,
    loginUrl: `${process.env.FRONTEND_URL}/login`,
  },
});
```

### Task Assignment Email
```typescript
await emailService.sendEmail({
  to: annotator.email,
  templateType: 'TASK_ASSIGNED',
  variables: {
    userName: annotator.name,
    projectName: project.name,
    taskId: task.id,
    deadline: task.deadline,
    taskUrl: `${process.env.FRONTEND_URL}/tasks/${task.id}`,
  },
});
```

---

## Admin UI Features

### Email Templates Management Page
- List all email templates
- Edit template (subject, HTML body, text body)
- Preview template with sample variables
- Enable/disable templates
- Test send email

### Email Configuration Page
- Configure SMTP settings
- Switch between providers (SMTP, SendGrid, AWS SES)
- Test connection

### Email Logs Page
- View all sent emails
- Filter by status (sent, failed, pending)
- Search by recipient
- Retry failed emails

---

## Benefits

1. **Reusable**: One service for all email types
2. **Configurable**: Admin can customize templates without code changes
3. **Extensible**: Easy to add new email types
4. **Trackable**: All emails logged in database
5. **Testable**: Admin can send test emails
6. **Flexible**: Support multiple email providers
7. **Maintainable**: Templates stored in DB, not hardcoded
