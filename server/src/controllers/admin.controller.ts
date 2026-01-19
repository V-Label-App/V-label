import { Request, Response } from 'express';
import { SystemConfigService } from '../services/system.config.service.js';
import { prisma } from '../utils/database.js';
import { EmailTemplateService } from '../services/email/template.service.js';
import { ROLE_PROMPTS } from '../config/rolePrompts.js';

export class AdminController {
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
            
            // Broadcast config update to all connected clients via WebSocket
            const { broadcastService } = await import('../websocket/events/broadcast.service.js');
            const { SystemEventType} = await import('../websocket/events/types.js');
            
            broadcastService.broadcastToAll(
                SystemEventType.CHAT_CONFIG_UPDATED,
                {
                    enabled: updated.value.enabled,
                    modelName: updated.value.modelName,
                    adminId,
                },
                adminId
            );
            
            // Save notification to database for offline users
            const { NotificationService } = await import('../services/notification.service.js');
            const { NotificationType } = await import('@prisma/client');
            await NotificationService.createNotificationForAllUsers({
                type: NotificationType.SYSTEM_ANNOUNCEMENT,
                title: 'AI Chat Widget Updated',
                message: updated.value.enabled 
                    ? 'AI Chat Widget has been enabled by Admin' 
                    : 'AI Chat Widget has been disabled by Admin',
                metadata: {
                    eventType: 'chat_config_updated',
                    enabled: updated.value.enabled,
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
}
