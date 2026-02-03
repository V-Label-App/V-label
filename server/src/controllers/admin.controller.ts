import { Request, Response } from 'express';
import { SystemConfigService } from '../services/system.config.service.js';
import { prisma } from '../utils/database.js';
import { EmailTemplateService } from '../services/email/template.service.js';
import { ROLE_PROMPTS } from '../config/rolePrompts.js';
import { AdminDashboardService } from '../services/admin-dashboard.service.js';

export class AdminController {
    /**
     * Get Dashboard Statistics
     */
    static async getDashboardStats(req: Request, res: Response) {
        try {
            const stats = await AdminDashboardService.getStats();
            return res.json(stats);
        } catch (error) {
            console.error('[Admin] Get dashboard stats error:', error);
            return res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
        }
    }

    /**
     * Get System Configuration (Chat Widget)
     */
    static async getChatConfig(req: Request, res: Response) {
        try {
            const config = await SystemConfigService.getChatConfig();
            return res.json(config);
        } catch (error) {
            console.error('[Admin] Get chat config error:', error);
            return res.status(500).json({ error: 'Failed to fetch config' });
        }
    }

    /**
     * Update System Configuration
     */
    static async updateChatConfig(req: Request, res: Response) {
        try {
            // TODO: Add stricter validation using Zod or similar
            const newConfig = req.body;
            const adminId = (req as any).user?.sub;
            const updated = await SystemConfigService.updateChatConfig(newConfig, adminId);

            // Render template first for both Broadcast and DB
            const { NotificationService } = await import('../services/notification.service.js');
            const { NotificationTemplateService } = await import('../services/notification.template.service.js');
            const { NotificationType } = await import('@prisma/client');

            const valueObj = updated.value as { enabled: boolean; modelName: string } | null;
            const rendered = await NotificationTemplateService.render(
                NotificationType.SYSTEM_CHAT_CONFIG,
                {
                    status: valueObj?.enabled ? 'enabled' : 'disabled',
                    adminName: 'Admin',
                    eventType: 'Chat Configuration Update'
                }
            );

            // Broadcast config update to all connected clients via WebSocket
            const { broadcastService } = await import('../websocket/events/broadcast.service.js');
            const { SystemEventType } = await import('../websocket/events/types.js');

            // If template is disabled, just broadcast config without notification
            if (!rendered) {
                broadcastService.broadcastToAll(
                    SystemEventType.CHAT_CONFIG_UPDATED,
                    {
                        enabled: valueObj?.enabled ?? false,
                        modelName: valueObj?.modelName ?? 'gemini-pro',
                        adminId,
                    },
                    adminId
                );
                return res.json(updated.value);
            }

            broadcastService.broadcastToAll(
                SystemEventType.CHAT_CONFIG_UPDATED,
                {
                    enabled: valueObj?.enabled ?? false,
                    modelName: valueObj?.modelName ?? 'gemini-pro',
                    adminId,
                    notification: {
                        title: rendered.title,
                        message: rendered.message
                    }
                },
                adminId
            );

            // Save notification to database for offline users
            await NotificationService.createNotificationForAllUsers({
                type: NotificationType.SYSTEM_CHAT_CONFIG,
                title: rendered.title,
                message: rendered.message,
                metadata: {
                    eventType: 'chat_config_updated',
                    enabled: valueObj?.enabled ?? false,
                    adminId,
                },
            });

            return res.json(updated.value);
        } catch (error) {
            console.error('[Admin] Update chat config error:', error);
            return res.status(500).json({ error: 'Failed to update config' });
        }
    }

    /**
     * Get Default Role Prompts (Hardcoded from rolePrompts.ts)
     */
    static async getDefaultRolePrompts(req: Request, res: Response) {
        try {
            return res.json(ROLE_PROMPTS);
        } catch (error) {
            console.error('[Admin] Get default role prompts error:', error);
            return res.status(500).json({ error: 'Failed to fetch default prompts' });
        }
    }

    /**
     * Get Audit Log Retention Configuration
     */
    static async getAuditLogConfig(req: Request, res: Response) {
        try {
            const config = await SystemConfigService.getAuditLogConfig();
            return res.json(config);
        } catch (error) {
            console.error('[Admin] Get audit log config error:', error);
            return res.status(500).json({ error: 'Failed to fetch config' });
        }
    }

    /**
     * Update Audit Log Retention Configuration
     */
    static async updateAuditLogConfig(req: Request, res: Response) {
        try {
            const newConfig = req.body;
            const adminId = (req as any).user?.sub;
            const updated = await SystemConfigService.updateAuditLogConfig(newConfig, adminId);
            return res.json(updated.value);
        } catch (error) {
            console.error('[Admin] Update audit log config error:', error);
            return res.status(500).json({ error: 'Failed to update config' });
        }
    }

    /**
     * Clean up old logs manually
     */
    static async cleanUpLogs(req: Request, res: Response) {
        try {
            const adminId = (req as any).user?.sub;
            const count = await SystemConfigService.cleanUpOldLogs(adminId);
            return res.json({ deletedCount: count });
        } catch (error) {
            console.error('[Admin] Cleanup logs error:', error);
            return res.status(500).json({ error: 'Failed to cleanup logs' });
        }
    }

    /**
     * Email Configuration (SMTP)
     */
    static async getEmailConfig(req: Request, res: Response) {
        try {
            let config = await prisma.emailConfig.findFirst({
                orderBy: { updatedAt: 'desc' }
            });

            // If no config in DB, return defaults from env
            if (!config) {
                return res.json({
                    provider: 'smtp',
                    isActive: false,
                    config: {
                        host: process.env.SMTP_HOST || 'smtp.gmail.com',
                        port: parseInt(process.env.SMTP_PORT || '587'),
                        auth: {
                            user: process.env.SMTP_USER || '',
                            pass: '', // Don't return password from env for security
                        }
                    }
                });
            }

            return res.json(config);
        } catch (error) {
            console.error('[Admin] Get email config error:', error);
            return res.status(500).json({ error: 'Failed to fetch config' });
        }
    }

    static async updateEmailConfig(req: Request, res: Response) {
        try {
            const { provider, config, isActive } = req.body;

            // Use a fixed key 'primary_config' since we only support one active config for now
            const updated = await prisma.emailConfig.upsert({
                where: { key: 'primary_config' },
                create: {
                    key: 'primary_config',
                    provider: provider || 'smtp',
                    config,
                    isActive: isActive ?? true
                },
                update: {
                    provider: provider || 'smtp',
                    config,
                    isActive: isActive ?? true
                },
            });
            return res.json(updated);
        } catch (error) {
            console.error('[Admin] Update email config error:', error);
            return res.status(500).json({ error: 'Failed to update configuration' });
        }
    }

    /**
     * Email Templates
     */
    static async getEmailTemplates(req: Request, res: Response) {
        try {
            const templateService = new EmailTemplateService();
            const templates = await templateService.getAllTemplates();
            return res.json(templates);
        } catch (error) {
            console.error('[Admin] Get templates error:', error);
            return res.status(500).json({ error: 'Failed to fetch templates' });
        }
    }

    static async upsertEmailTemplate(req: Request, res: Response) {
        try {
            const templateService = new EmailTemplateService();
            const updated = await templateService.upsertTemplate(req.body);
            return res.json(updated);
        } catch (error) {
            console.error('[Admin] Upsert template error:', error);
            return res.status(500).json({ error: 'Failed to update template' });
        }
    }

    static async deleteEmailTemplate(req: Request, res: Response) {
        try {
            const { type } = req.params;
            if (!type) throw new Error('Template type is required');
            const templateService = new EmailTemplateService();
            await templateService.deleteTemplate(type as string);
            return res.json({ success: true });
        } catch (error) {
            console.error('[Admin] Delete template error:', error);
            return res.status(500).json({ error: 'Failed to delete template' });
        }
    }

    /**
     * Email Logs
     */
    static async getEmailLogs(req: Request, res: Response) {
        try {
            const logs = await prisma.emailLog.findMany({
                take: 100,
                orderBy: { createdAt: 'desc' }
            });
            return res.json(logs);
        } catch (error) {
            console.error('[Admin] Get email logs error:', error);
            return res.status(500).json({ error: 'Failed to fetch logs' });
        }
    }

    static async deleteEmailLog(req: Request, res: Response) {
        try {
            const rawId = req.params.id;
            const id = (Array.isArray(rawId) ? rawId[0] : rawId) ?? '';
            await prisma.emailLog.delete({
                where: { id }
            });
            return res.json({ success: true });
        } catch (error) {
            console.error('[Admin] Delete email log error:', error);
            return res.status(500).json({ error: 'Failed to delete log' });
        }
    }

    static async clearEmailLogs(req: Request, res: Response) {
        try {
            await prisma.emailLog.deleteMany({});
            return res.json({ success: true });
        } catch (error) {
            console.error('[Admin] Clear email logs error:', error);
            return res.status(500).json({ error: 'Failed to clear logs' });
        }
    }
    /**
     * Broadcast System Announcement
     */
    static async broadcastAnnouncement(req: Request, res: Response) {
        try {
            const { title, message } = req.body;
            const adminId = (req as any).user?.sub;

            if (!title || !message) {
                return res.status(400).json({ error: 'Title and message are required' });
            }

            const { NotificationService } = await import('../services/notification.service.js');
            const result = await NotificationService.createSystemAnnouncement(title, message, adminId);

            return res.json({ success: true, count: result.count });
        } catch (error) {
            console.error('[Admin] Broadcast announcement error:', error);
            return res.status(500).json({ error: 'Failed to broadcast announcement' });
        }
    }
    /**
     * Get Cloudinary Usage Stats
     */
    static async getCloudinaryUsage(req: Request, res: Response) {
        try {
            const { ImageService } = await import('../services/image.service.js');
            const usage = await ImageService.getUsage();
            return res.json(usage);
        } catch (error) {
            console.error('[Admin] Get Cloudinary usage error:', error);
            return res.status(500).json({ error: 'Failed to fetch Cloudinary usage' });
        }
    }

    /**
     * Get Cloudinary Resources (Images)
     */
    static async getCloudinaryResources(req: Request, res: Response) {
        try {
            const { cursor, maxResults, folder } = req.query;
            const limit = maxResults ? parseInt(maxResults as string) : 20;

            const { ImageService } = await import('../services/image.service.js');
            const data = await ImageService.getImages(cursor as string, limit, folder as string);

            return res.json(data);
        } catch (error) {
            console.error('[Admin] Get Cloudinary resources error:', error);
            return res.status(500).json({ error: 'Failed to fetch Cloudinary resources' });
        }
    }
}
