import { prisma } from '../../utils/database.js';

export interface EmailTemplateData {
  type: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: string[];
  enabled?: boolean;
}

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
  async upsertTemplate(data: EmailTemplateData) {
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
    const defaults: EmailTemplateData[] = [
      {
        type: 'PASSWORD_RESET',
        subject: 'Reset Your VLabel Password',
        htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>You requested to reset your password for your VLabel account.</p>
      <p>Click the button below to reset your password:</p>
      <a href="{{resetUrl}}" class="button">Reset Password</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #3b82f6;">{{resetUrl}}</p>
      <p><strong>This link will expire in {{expirationTime}}.</strong></p>
      <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>VLabel Team</p>
    </div>
  </div>
</body>
</html>
        `,
        variables: ['userName', 'resetUrl', 'expirationTime'],
      },
      {
        type: 'WELCOME',
        subject: 'Welcome to VLabel!',
        htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .badge { display: inline-block; padding: 4px 12px; background-color: #10b981; color: white; border-radius: 12px; font-size: 14px; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to VLabel!</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>Thank you for joining VLabel. We're excited to have you on board!</p>
      <p>Your account has been created with the role: <span class="badge">{{userRole}}</span></p>
      <p>Get started by logging in to your account:</p>
      <a href="{{loginUrl}}" class="button">Login Now</a>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>VLabel Team</p>
    </div>
  </div>
</body>
</html>
        `,
        variables: ['userName', 'userRole', 'loginUrl'],
      },
      {
        type: 'TASK_ASSIGNED',
        subject: 'New Task Assigned - {{projectName}}',
        htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .task-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .task-info li { margin: 8px 0; }
    .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Task Assigned</h1>
    </div>
    <div class="content">
      <p>Hi {{userName}},</p>
      <p>You have been assigned a new annotation task:</p>
      <div class="task-info">
        <ul style="list-style: none; padding: 0;">
          <li><strong>Project:</strong> {{projectName}}</li>
          <li><strong>Task ID:</strong> {{taskId}}</li>
          <li><strong>Deadline:</strong> {{deadline}}</li>
        </ul>
      </div>
      <a href="{{taskUrl}}" class="button">View Task</a>
      <p>Please complete this task before the deadline to maintain your reputation score.</p>
    </div>
    <div class="footer">
      <p>Best regards,<br>VLabel Team</p>
    </div>
  </div>
</body>
</html>
        `,
        variables: ['userName', 'projectName', 'taskId', 'deadline', 'taskUrl'],
      },
    ];

    const results = [];
    for (const template of defaults) {
      const result = await this.upsertTemplate(template);
      results.push(result);
    }

    console.log(`[EmailTemplate] Seeded ${results.length} default templates`);
    return results;
  }
}
