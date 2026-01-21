import { prisma } from '../utils/database.js';
import { LabelRequestStatus, NotificationType } from '@prisma/client';
import { NotificationService } from './notification.service.js';
import { NotificationTemplateService } from './notification.template.service.js';
import { LabelService, ProjectLabelService } from './label.service.js';
import { broadcastService } from '../websocket/events/broadcast.service.js';
import { SystemEventType } from '../websocket/events/types.js';

export class LabelRequestService {
  /**
   * Get all requests for a project
   */
  static async getProjectRequests(projectId: string, status?: LabelRequestStatus) {
    return await prisma.labelRequest.findMany({
      where: {
        projectId,
        ...(status && { status }),
      },
      include: {
        requester: {
          select: { id: true, fullName: true, email: true, avatarUrl: true },
        },
        reviewer: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get pending requests count for a project
   */
  static async getPendingCount(projectId: string) {
    return await prisma.labelRequest.count({
      where: {
        projectId,
        status: LabelRequestStatus.PENDING,
      },
    });
  }

  /**
   * Create a label request (Annotator action)
   */
  static async createRequest(data: {
    projectId: string;
    requestedBy: string;
    labelName: string;
    suggestedColor?: string;
    reason?: string;
  }) {
    // Validate color format if provided
    if (data.suggestedColor && !/^#[0-9A-Fa-f]{6}$/.test(data.suggestedColor)) {
      throw new Error('Invalid color format. Use hex format: #RRGGBB');
    }

    // Check if there's already a pending request for same label name in this project
    const existingRequest = await prisma.labelRequest.findFirst({
      where: {
        projectId: data.projectId,
        labelName: { equals: data.labelName, mode: 'insensitive' },
        status: LabelRequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      throw new Error(`A request for label "${data.labelName}" is already pending`);
    }

    // Check if label already exists in project
    const existingLabel = await prisma.projectLabel.findFirst({
      where: {
        projectId: data.projectId,
        label: {
          name: { equals: data.labelName, mode: 'insensitive' },
        },
      },
    });

    if (existingLabel) {
      throw new Error(`Label "${data.labelName}" already exists in this project`);
    }

    // Create the request
    const request = await prisma.labelRequest.create({
      data: {
        projectId: data.projectId,
        requestedBy: data.requestedBy,
        labelName: data.labelName,
        suggestedColor: data.suggestedColor ?? null,
        reason: data.reason ?? null,
      },
      include: {
        requester: {
          select: { id: true, fullName: true, email: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    // Notify project managers
    await this.notifyManagers({
      id: request.id,
      labelName: request.labelName,
      requester: request.requester,
      project: request.project,
    });

    return request;
  }

  /**
   * Approve a label request (Manager action)
   */
  static async approveRequest(requestId: string, reviewerId: string, categoryId?: string) {
    const request = await prisma.labelRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, fullName: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!request) {
      throw new Error('Label request not found');
    }

    if (request.status !== LabelRequestStatus.PENDING) {
      throw new Error(`Request is already ${request.status.toLowerCase()}`);
    }

    // Create the label
    const createLabelData: {
      name: string;
      color: string;
      isGlobal?: boolean;
      categoryId?: string;
      createdBy: string;
    } = {
      name: request.labelName,
      color: request.suggestedColor || this.generateRandomColor(),
      isGlobal: false, // Requested labels are project-specific by default
      createdBy: reviewerId,
    };
    if (categoryId) {
      createLabelData.categoryId = categoryId;
    }
    const label = await LabelService.create(createLabelData);

    // Assign label to project
    await ProjectLabelService.assignLabel(request.projectId, label.id);

    // Update request status
    const updatedRequest = await prisma.labelRequest.update({
      where: { id: requestId },
      data: {
        status: LabelRequestStatus.APPROVED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // Render notification using template
    const rendered = await NotificationTemplateService.render(
      NotificationType.LABEL_REQUEST_APPROVED,
      {
        labelName: request.labelName,
        projectName: request.project.name,
        projectId: request.projectId,
        labelId: label.id,
        requestId,
      }
    );

    // Notify the requester and broadcast via WebSocket
    const notification = await NotificationService.createNotification({
      userId: request.requestedBy,
      type: NotificationType.LABEL_REQUEST_APPROVED,
      title: rendered.title,
      message: rendered.message,
      metadata: {
        requestId,
        labelId: label.id,
        labelName: request.labelName,
        projectId: request.projectId,
        projectName: request.project.name,
      },
    });

    // Broadcast to requester via WebSocket
    broadcastService.broadcastToUser(request.requestedBy, SystemEventType.NOTIFICATION_CREATED, {
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      },
    });

    return { request: updatedRequest, label };
  }

  /**
   * Reject a label request (Manager action)
   */
  static async rejectRequest(requestId: string, reviewerId: string, reason?: string) {
    const request = await prisma.labelRequest.findUnique({
      where: { id: requestId },
      include: {
        requester: {
          select: { id: true, fullName: true },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!request) {
      throw new Error('Label request not found');
    }

    if (request.status !== LabelRequestStatus.PENDING) {
      throw new Error(`Request is already ${request.status.toLowerCase()}`);
    }

    // Update request status
    const updatedRequest = await prisma.labelRequest.update({
      where: { id: requestId },
      data: {
        status: LabelRequestStatus.REJECTED,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
    });

    // Render notification using template
    const rendered = await NotificationTemplateService.render(
      NotificationType.LABEL_REQUEST_REJECTED,
      {
        labelName: request.labelName,
        projectName: request.project.name,
        projectId: request.projectId,
        requestId,
        reason: reason ? ` Reason: ${reason}` : '',
      }
    );

    // Notify the requester and broadcast via WebSocket
    const notification = await NotificationService.createNotification({
      userId: request.requestedBy,
      type: NotificationType.LABEL_REQUEST_REJECTED,
      title: rendered.title,
      message: rendered.message,
      metadata: {
        requestId,
        labelName: request.labelName,
        projectId: request.projectId,
        projectName: request.project.name,
        rejectionReason: reason,
      },
    });

    // Broadcast to requester via WebSocket
    broadcastService.broadcastToUser(request.requestedBy, SystemEventType.NOTIFICATION_CREATED, {
      notification: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        metadata: notification.metadata,
        isRead: notification.isRead,
        createdAt: notification.createdAt,
      },
    });

    return updatedRequest;
  }

  /**
   * Notify project managers about new label request
   */
  private static async notifyManagers(request: {
    id: string;
    labelName: string;
    requester: { id: string; fullName: string | null };
    project: { id: string; name: string };
  }) {
    // Get project members who are managers or admins
    const managers = await prisma.projectMember.findMany({
      where: {
        projectId: request.project.id,
        user: {
          role: { in: ['ADMIN', 'MANAGER'] },
        },
      },
      include: {
        user: {
          select: { id: true },
        },
      },
    });

    // Also notify admins who might not be project members
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isActive: true,
      },
      select: { id: true },
    });

    const managerIds = new Set([
      ...managers.map((m) => m.user.id),
      ...admins.map((a) => a.id),
    ]);

    // Don't notify the requester if they're also a manager
    managerIds.delete(request.requester.id);

    // Render notification using template
    const rendered = await NotificationTemplateService.render(
      NotificationType.LABEL_REQUESTED,
      {
        requesterName: request.requester.fullName || 'An annotator',
        labelName: request.labelName,
        projectName: request.project.name,
        projectId: request.project.id,
        requestId: request.id,
      }
    );

    // Create notifications and broadcast via WebSocket
    for (const managerId of managerIds) {
      const notification = await NotificationService.createNotification({
        userId: managerId,
        type: NotificationType.LABEL_REQUESTED,
        title: rendered.title,
        message: rendered.message,
        metadata: {
          requestId: request.id,
          labelName: request.labelName,
          projectId: request.project.id,
          projectName: request.project.name,
          requesterId: request.requester.id,
        },
      });

      // Broadcast to manager via WebSocket
      broadcastService.broadcastToUser(managerId, SystemEventType.NOTIFICATION_CREATED, {
        notification: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata,
          isRead: notification.isRead,
          createdAt: notification.createdAt,
        },
      });
    }
  }

  /**
   * Generate a random color for labels without suggested color
   */
  private static generateRandomColor(): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8B500', '#00CED1', '#FF69B4', '#32CD32', '#FF4500',
    ];
    return colors[Math.floor(Math.random() * colors.length)] as string;
  }
}
