import { PrismaClient, NotificationType } from '@prisma/client';
import { prisma } from '../utils/database.js';

export interface TemplateVariables {
  [key: string]: string | number | boolean;
}

export class NotificationTemplateService {
  /**
   * Seed default templates for all notification types
   */
  static async seedDefaultTemplates() {
    const defaults: Record<NotificationType, { title: string; message: string; variables: string[] }> = {
      SYSTEM_ANNOUNCEMENT: {
        title: '{title}',
        message: '{message}',
        variables: ['title', 'message', 'adminName']
      },
      TASK_ASSIGNED: {
        title: 'New Task Assigned',
        message: 'You have been assigned to task "{taskName}" in project "{projectName}".',
        variables: ['managerName', 'taskName', 'projectName', 'taskId']
      },
      TASK_SUBMITTED: {
        title: 'Task Submitted',
        message: '{annotatorName} submitted task "{taskName}".',
        variables: ['annotatorName', 'taskName', 'projectName', 'taskId']
      },
      TASK_APPROVED: {
        title: 'Task Approved',
        message: 'Your task "{taskName}" has been approved by {reviewerName}.',
        variables: ['reviewerName', 'taskName', 'projectName', 'taskId']
      },
      TASK_REJECTED: {
        title: 'Task Rejected',
        message: 'Your task "{taskName}" was rejected. Feedback: "{feedback}".',
        variables: ['reviewerName', 'taskName', 'projectName', 'taskId', 'feedback']
      },
      DEADLINE_WARNING: {
        title: 'Deadline Approaching',
        message: 'Task "{taskName}" is due in {hours} hours.',
        variables: ['taskName', 'projectName', 'hours', 'deadline']
      },
      COMMENT_MENTION: {
        title: 'New Mention',
        message: '{userName} mentioned you in task "{taskName}".',
        variables: ['userName', 'taskName', 'projectName', 'commentContent']
      },
      SYSTEM_CHAT_CONFIG: {
        title: 'AI Chat Widget Update',
        message: 'The AI Chat Widget has been {status} by {adminName}.',
        variables: ['status', 'adminName', 'eventType']
      },
      SYSTEM_USER_ROLE_CHANGE: {
        title: 'Role Updated',
        message: 'Your role has been changed from {oldRole} to {newRole} by {adminName}.',
        variables: ['oldRole', 'newRole', 'adminName', 'userName']
      },
      LABEL_REQUESTED: {
        title: 'New Label Request',
        message: '{requesterName} requested a new label "{labelName}" for project "{projectName}".',
        variables: ['requesterName', 'labelName', 'projectName', 'projectId', 'requestId']
      },
      LABEL_REQUEST_APPROVED: {
        title: 'Label Request Approved',
        message: 'Your request for label "{labelName}" in project "{projectName}" has been approved.',
        variables: ['labelName', 'projectName', 'projectId', 'labelId', 'requestId']
      },
      LABEL_REQUEST_REJECTED: {
        title: 'Label Request Rejected',
        message: 'Your request for label "{labelName}" in project "{projectName}" has been rejected.{reason}',
        variables: ['labelName', 'projectName', 'projectId', 'requestId', 'reason']
      },
      LABEL_CREATED: {
        title: 'New Label Created',
        message: 'A new label "{labelName}" has been created in category "{categoryName}" by {creatorName}.',
        variables: ['labelName', 'labelColor', 'categoryName', 'creatorName', 'isGlobal']
      },
      PROJECT_INVITATION: {
        title: 'Project Invitation',
        message: 'You have been added to project "{projectName}" as {role}.',
        variables: ['projectName', 'role', 'invitedBy']
      }
    };

    for (const [type, template] of Object.entries(defaults)) {
      await prisma.notificationTemplate.upsert({
        where: { type: type as NotificationType },
        update: {}, // Don't overwrite if exists
        create: {
          type: type as NotificationType,
          titleTemplate: template.title,
          messageTemplate: template.message,
          variables: template.variables,
          isActive: true
        }
      });
    }
  }

  /**
   * Get template by type
   */
  static async getTemplate(type: NotificationType) {
    return prisma.notificationTemplate.findUnique({
      where: { type }
    });
  }

  /**
   * Update template
   */
  static async updateTemplate(type: NotificationType, data: { titleTemplate?: string; messageTemplate?: string; isActive?: boolean }) {
    return prisma.notificationTemplate.update({
      where: { type },
      data
    });
  }

  /**
   * Render template with variables
   * Returns null if template is disabled
   */
  static async render(type: NotificationType, variables: TemplateVariables): Promise<{ title: string; message: string } | null> {
    const template = await this.getTemplate(type);

    if (!template || !template.isActive) {
      // Return null to indicate template is disabled
      console.log(`[NotificationTemplate] Template ${type} is disabled, skipping notification`);
      return null;
    }

    let title = template.titleTemplate;
    let message = template.messageTemplate;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{${key}}`, 'g');
      title = title.replace(regex, String(value));
      message = message.replace(regex, String(value));
    }

    return { title, message };
  }

  /**
   * Get all templates
   */
  static async getAllTemplates() {
    return prisma.notificationTemplate.findMany({
      orderBy: { type: 'asc' }
    });
  }
}
