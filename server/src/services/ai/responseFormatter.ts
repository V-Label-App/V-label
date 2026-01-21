import {
    AIResponse,
    TableContent,
    FormContent,
    CardContent,
    ActionButtonsContent,
    ChartContent,
    ButtonAction
} from '../../types/aiResponse.types.js';
import logger from '../../utils/logger.js';

/**
 * ResponseFormatter - Utility for formatting function results into typed UI components
 * 
 * This class provides methods to convert raw data into structured AIResponse objects
 * that can be rendered as interactive UI components on the frontend.
 */
export class ResponseFormatter {

    /**
     * Format data array as an interactive table
     * @param data - Array of objects to display
     * @param options - Optional table configuration (actions, sorting, filtering)
     */
    static asTable(data: any[], options?: { actions?: ButtonAction[]; sortable?: boolean; filterable?: boolean }): AIResponse {
        if (!data || data.length === 0) {
            return this.asText('No data found.');
        }

        // Extract headers from first object keys
        const headers = Object.keys(data[0]);

        // Convert objects to array of values
        const rows = data.map(item => headers.map(header => item[header]));

        const response: AIResponse = {
            type: 'table' as const,
            content: {
                headers,
                rows,
                actions: options?.actions,
                sortable: options?.sortable ?? false,
                filterable: options?.filterable ?? false
            } as TableContent
        };

        logger.info('ResponseFormatter', '📊 asTable() called', {
            rowCount: data.length,
            columnCount: headers.length,
            hasActions: !!options?.actions
        });

        return response;
    }

    /**
     * Format as an interactive form
     * Used when function needs user input
     */
    static asForm(config: FormContent): AIResponse {
        const response: AIResponse = {
            type: 'form' as const,
            content: config,
            metadata: {
                action: config.id,
                title: config.title
            }
        };

        logger.info('ResponseFormatter', '📝 asForm() called', {
            formId: config.id,
            title: config.title,
            fieldCount: config.fields.length
        });

        return response;
    }

    /**
     * Format as an info card
     * Good for displaying structured information or success/error messages
     */
    static asCard(data: CardContent): AIResponse {
        const response: AIResponse = {
            type: 'card' as const,
            content: data,
            metadata: { title: data.title }
        };

        logger.info('ResponseFormatter', '💳 asCard() called', {
            title: data.title,
            variant: data.variant || 'default',
            fieldCount: Object.keys(data.fields).length
        });

        return response;
    }

    /**
     * Format as plain text (markdown supported)
     */
    static asText(message: string): AIResponse {
        return {
            type: 'text',
            content: message
        };
    }

    /**
     * Format as action buttons
     * Provides quick action choices to the user
     */
    static asActionButtons(config: ActionButtonsContent): AIResponse {
        return {
            type: 'action_buttons',
            content: config,
            ...(config.title && { metadata: { title: config.title } })
        };
    }

    /**
     * Format as chart/visualization
     */
    static asChart(config: ChartContent): AIResponse {
        return {
            type: 'chart',
            content: config
        };
    }

    /**
     * Auto-detect format based on data structure
     * Provides intelligent fallback formatting
     */
    static auto(result: any): AIResponse {
        // Already formatted
        if (result && result.type && result.content) {
            return result as AIResponse;
        }

        // Has explicit message field
        if (result && result.message && typeof result.message === 'string') {
            return this.asText(result.message);
        }

        // Array → table
        if (Array.isArray(result)) {
            return this.asTable(result);
        }

        // Has users array → table
        if (result && result.users && Array.isArray(result.users)) {
            return this.asTable(result.users);
        }

        // Has user object → card
        if (result && result.user && typeof result.user === 'object') {
            return this.asCard({
                title: 'User Information',
                fields: result.user,
                variant: 'default'
            });
        }

        // Object with known fields → card
        if (result && typeof result === 'object' && !Array.isArray(result)) {
            const fields = Object.keys(result);
            if (fields.length > 0 && fields.length < 10) {
                return this.asCard({
                    title: 'Result',
                    fields: result,
                    variant: 'default'
                });
            }
        }

        // Default: stringify as text
        return this.asText('```json\n' + JSON.stringify(result, null, 2) + '\n```');
    }
}
