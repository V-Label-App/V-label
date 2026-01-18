import { prisma } from '../utils/database.js';

export const SYSTEM_CONFIG_KEYS = {
  CHAT_WIDGET: 'chatWidget',
};

export interface ChatWidgetConfig {
  enabled: boolean;
  modelName: string;
  systemPrompt: string;
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
}

const DEFAULT_CHAT_CONFIG: ChatWidgetConfig = {
  enabled: false,
  modelName: 'gemini-1.5-pro', // Fallback defaults
  systemPrompt: `# Role
You are the AI Assistant for V-Label, a professional data labeling platform. Your purpose is to help users manage projects, label data, and navigate the application efficiently.

# Core Capabilities
- **Project Management**: Explain how to create, edit, and manage labeling projects.
- **Labeling Support**: Guide users on how to use bounding boxes, polygons, and classification tools.
- **User Management**: Assist with role assignments (Admin, Manager, Annotator) and profile settings.
- **Troubleshooting**: Help resolve common issues like login failures or export errors.

# Tone & Style
- Professional, concise, and technical when necessary.
- Focus on actionable steps and platform-specific terminology.
- Be encouraging and helpful.`,
  temperature: 0.7,
  ui: {
    themeColor: '#0ea5e9',
    position: 'right',
    welcomeMessage: 'Hello! How can I help you regarding V-Label?',
    botId: 'v-label',
    iconType: 'default',
    quickReplies: []
  }
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
      systemPrompt: saved.systemPrompt || DEFAULT_CHAT_CONFIG.systemPrompt,
      temperature: saved.temperature ?? DEFAULT_CHAT_CONFIG.temperature,
      ui: {
        ...DEFAULT_CHAT_CONFIG.ui,
        ...(saved.ui || {})
      }
    };
  }

  /**
   * Update Chat Widget Configuration
   */
  static async updateChatConfig(newConfig: Partial<ChatWidgetConfig>) {
    // First get existing to merge
    const current = await this.getChatConfig();
    
    const updated = {
      ...current,
      ...newConfig,
      ui: {
        ...current.ui,
        ...(newConfig.ui || {})
      }
    };

    return prisma.systemConfig.upsert({
      where: { key: SYSTEM_CONFIG_KEYS.CHAT_WIDGET },
      update: { value: updated as any },
      create: { key: SYSTEM_CONFIG_KEYS.CHAT_WIDGET, value: updated as any }
    });
  }
}
