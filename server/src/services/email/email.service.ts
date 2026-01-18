import nodemailer from 'nodemailer';
import { prisma } from '../../utils/database.js';
import logger from '../../utils/logger.js';

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
   * Initialize email transporter based on active config or env variables
   */
  private async initializeTransporter() {
    try {
      // Try to get active config from database
      const activeConfig = await prisma.emailConfig.findFirst({
        where: { isActive: true }
      });

      if (activeConfig) {
        // Initialize based on provider
        switch (activeConfig.provider) {
          case 'smtp':
            this.transporter = nodemailer.createTransport(activeConfig.config as any);
            break;
          case 'sendgrid':
            // TODO: SendGrid implementation
            logger.warn('[Email]','SendGrid not implemented yet, falling back to env config');
            this.initializeFromEnv();
            break;
          case 'aws_ses':
            // TODO: AWS SES implementation
            logger.warn('[Email]','AWS SES not implemented yet, falling back to env config');
            this.initializeFromEnv();
            break;
          default:
            this.initializeFromEnv();
        }
      } else {
        // Fallback to env variables
        this.initializeFromEnv();
      }
    } catch (error) {
      logger.error('[Email] Failed to initialize from DB, using env config:', error);
      this.initializeFromEnv();
    }
  }

  /**
   * Initialize transporter from environment variables
   */
  private initializeFromEnv() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
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
          throw new Error(`Template ${options.templateType} not found or disabled`);
        }

        subject = this.renderTemplate(template.subject, options.variables || {});
        html = this.renderTemplate(template.htmlBody, options.variables || {});
        text = template.textBody ? this.renderTemplate(template.textBody, options.variables || {}) : undefined;
      }

      if (!subject) {
        throw new Error('Email subject is required');
      }

      // Send email
      const result = await this.transporter.sendMail({
        from: process.env.SMTP_USER || 'noreply@vlabel.com',
        to: Array.isArray(options.to) ? options.to.join(',') : options.to,
        subject,
        html,
        text,
      });

      // Log success
      await this.logEmail({
        to: Array.isArray(options.to) ? options.to[0] : options.to,
        from: process.env.SMTP_USER || 'noreply@vlabel.com',
        subject: subject || '',
        templateType: options.templateType,
        status: 'sent',
        sentAt: new Date(),
      });

      logger.info('[Email] Sent successfully:', result.messageId);
    } catch (error: any) {
      logger.error('[Email] Send failed:', error);
      
      // Log failure
      await this.logEmail({
        to: Array.isArray(options.to) ? options.to[0] : options.to,
        from: process.env.SMTP_USER || 'noreply@vlabel.com',
        subject: options.subject || options.templateType || 'Unknown',
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
      rendered = rendered.replace(regex, String(variables[key]));
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
    try {
      await prisma.emailLog.create({ data });
    } catch (error) {
      logger.error('[Email] Failed to log email:', error);
      // Don't throw - logging failure shouldn't break email sending
    }
  }
}
