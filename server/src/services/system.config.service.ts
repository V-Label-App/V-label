import { prisma } from '../utils/database.js';

export interface ChatFunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  enabled: boolean;
  roles: string[]; // e.g. ['ADMIN', 'MANAGER']
}

export const SYSTEM_CONFIG_KEYS = {
  CHAT_WIDGET: 'chatWidget',
  AUDIT_LOG_RETENTION: 'auditLogRetention',
};

export interface ChatWidgetConfig {
  enabled: boolean;
  modelName: string;
  systemPrompt: string;
  knowledgeBase?: string; // Documentation/FAQ content to enhance AI context
  
  // Per-role custom prompts (optional, overrides defaults from rolePrompts.ts)
  rolePrompts?: {
    MANAGER?: string;
    ANNOTATOR?: string;
    REVIEWER?: string;
    ADMIN?: string;
  };
  
  temperature: number;
  ui: {
    themeColor: string;
    position: 'left' | 'right';
    welcomeMessage: string;
    botId: string; // "v-label" or custom name
    iconType: 'default' | 'custom';
    customIconUrl?: string;
    quickReplies: string[];
  };
  functions?: ChatFunctionDefinition[];
}

export interface AuditLogConfig {
  retentionDays: number; // 30, 60, 90, etc. 0 means keep forever
}

const DEFAULT_CHAT_CONFIG: ChatWidgetConfig = {
  enabled: false,
  modelName: 'gemini-1.5-pro', // Fallback defaults
  systemPrompt: '', // Empty by default, so role-based prompts are used
  temperature: 0.7,
  ui: {
    themeColor: '#0ea5e9',
    position: 'right',
    welcomeMessage: 'Hello! How can I help you regarding V-Label?',
    botId: 'v-label',
    iconType: 'default',
    quickReplies: []
  },
  functions: []
};

const DEFAULT_AUDIT_LOG_CONFIG: AuditLogConfig = {
  retentionDays: 30
};

export class SystemConfigService {
  /**
   * Get Chat Widget Configuration
   * Merges with defaults to ensure all fields exist
   */
  static async getChatConfig(): Promise<ChatWidgetConfig> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: SYSTEM_CONFIG_KEYS.CHAT_WIDGET }
    });

    if (!config || !config.value) {
      return DEFAULT_CHAT_CONFIG;
    }

    // Merge saved config with defaults (shallow merge isn't enough for nested UI, so we do deeper merge or just careful access)
    // Here we trust the parsed JSON but fill missing keys if needed. 
    // Simply spreading works well if we assume structural integrity, but for robustness:
    const saved = config.value as Partial<ChatWidgetConfig>;
    
    return {
      enabled: saved.enabled ?? DEFAULT_CHAT_CONFIG.enabled,
      modelName: saved.modelName || DEFAULT_CHAT_CONFIG.modelName,
      systemPrompt: saved.systemPrompt ?? DEFAULT_CHAT_CONFIG.systemPrompt,
      knowledgeBase: saved.knowledgeBase || '', // Return from DB or empty string
      temperature: saved.temperature ?? DEFAULT_CHAT_CONFIG.temperature,
      rolePrompts: saved.rolePrompts || {}, // Return from DB or empty object
      ui: {
        ...DEFAULT_CHAT_CONFIG.ui,
        ...(saved.ui || {})
      },
      functions: saved.functions || []
    };
  }

  /**
   * Update Chat Widget Configuration
   */
  static async updateChatConfig(newConfig: Partial<ChatWidgetConfig>, adminId?: string) {
    // First get existing to merge
    const current = await this.getChatConfig();
    
    const updated = {
      ...current,
      ...newConfig,
      ui: {
        ...current.ui,
        ...(newConfig.ui || {})
      },
      // Properly merge rolePrompts if provided
      rolePrompts: newConfig.rolePrompts !== undefined ? {
        ...current.rolePrompts,
        ...newConfig.rolePrompts
      } : current.rolePrompts
    };

    // Log all config changes if adminId is present
    if (adminId) {
      // Determine action type based on what changed
      let action = 'UPDATE_CHAT_CONFIG';
      if (newConfig.enabled !== undefined && newConfig.enabled !== current.enabled) {
        action = updated.enabled ? 'ENABLE_CHAT_WIDGET' : 'DISABLE_CHAT_WIDGET';
      }

      await prisma.auditLog.create({
        data: {
          action,
          actorId: adminId,
          targetId: null, // System config has no UUID target
          metadata: {
            target: 'chatWidget',
            changes: {
              enabled: newConfig.enabled !== undefined ? { old: current.enabled, new: updated.enabled } : undefined,
              modelName: newConfig.modelName ? { old: current.modelName, new: updated.modelName } : undefined,
              systemPrompt: newConfig.systemPrompt ? { old: current.systemPrompt?.substring(0, 100), new: updated.systemPrompt?.substring(0, 100) } : undefined,
              temperature: newConfig.temperature !== undefined ? { old: current.temperature, new: updated.temperature } : undefined,
              ui: newConfig.ui ? {
                themeColor: newConfig.ui.themeColor ? { old: current.ui.themeColor, new: updated.ui.themeColor } : undefined,
                position: newConfig.ui.position ? { old: current.ui.position, new: updated.ui.position } : undefined,
                welcomeMessage: newConfig.ui.welcomeMessage ? { old: current.ui.welcomeMessage, new: updated.ui.welcomeMessage } : undefined,
                botId: newConfig.ui.botId ? { old: current.ui.botId, new: updated.ui.botId } : undefined,
                iconType: newConfig.ui.iconType ? { old: current.ui.iconType, new: updated.ui.iconType } : undefined,
                customIconUrl: newConfig.ui.customIconUrl ? { old: current.ui.customIconUrl, new: updated.ui.customIconUrl } : undefined,
                quickReplies: newConfig.ui.quickReplies ? { old: current.ui.quickReplies, new: updated.ui.quickReplies } : undefined,
              } : undefined,
              functions: newConfig.functions ? { old: current.functions?.length, new: updated.functions?.length } : undefined
            },
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    return prisma.systemConfig.upsert({
      where: { key: SYSTEM_CONFIG_KEYS.CHAT_WIDGET },
      update: { value: updated as any },
      create: { key: SYSTEM_CONFIG_KEYS.CHAT_WIDGET, value: updated as any }
    });
  }

  /**
   * Get Audit Log Configuration
   */
  static async getAuditLogConfig(): Promise<AuditLogConfig> {
    const config = await prisma.systemConfig.findUnique({
      where: { key: SYSTEM_CONFIG_KEYS.AUDIT_LOG_RETENTION }
    });

    if (!config || !config.value) {
      return DEFAULT_AUDIT_LOG_CONFIG;
    }

    const saved = config.value as Partial<AuditLogConfig>;
    return {
      retentionDays: saved.retentionDays ?? DEFAULT_AUDIT_LOG_CONFIG.retentionDays
    };
  }

  /**
   * Update Audit Log Configuration
   */
  static async updateAuditLogConfig(newConfig: Partial<AuditLogConfig>, adminId?: string) {
    const current = await this.getAuditLogConfig();
    const updated = { ...current, ...newConfig };

    // Log configuration change
    if (adminId && newConfig.retentionDays !== undefined && newConfig.retentionDays !== current.retentionDays) {
      await prisma.auditLog.create({
        data: {
          action: 'UPDATE_RETENTION_POLICY',
          actorId: adminId,
          targetId: null, // System config has no UUID target
          metadata: {
            field: 'retentionDays',
            oldValue: current.retentionDays,
            newValue: updated.retentionDays,
            timestamp: new Date().toISOString()
          }
        }
      });
    }

    return prisma.systemConfig.upsert({
      where: { key: SYSTEM_CONFIG_KEYS.AUDIT_LOG_RETENTION },
      update: { value: updated as any },
      create: { key: SYSTEM_CONFIG_KEYS.AUDIT_LOG_RETENTION, value: updated as any }
    });
  }

  /**
   * Cleanup Old Logs
   * Returns count of deleted logs
   */
  static async cleanUpOldLogs(adminId?: string) {
    const config = await this.getAuditLogConfig();
    
    // 0 means keep forever
    if (config.retentionDays <= 0) {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - config.retentionDays);

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    // Log the cleanup action if triggered manually
    if (adminId && result.count > 0) {
      await prisma.auditLog.create({
        data: {
          action: 'CLEANUP_LOGS',
          actorId: adminId,
          targetId: null,
          metadata: {
            deletedCount: result.count,
            cutoffDate: cutoffDate.toISOString(),
            retentionDays: config.retentionDays
          }
        }
      });
    }

    return result.count;
  }
}
