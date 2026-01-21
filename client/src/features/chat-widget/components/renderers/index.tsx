import type { AIResponse } from '../../../../types/aiResponse';
import { TextRenderer } from './TextRenderer';
import { TableRenderer } from './TableRenderer';
import { FormRenderer } from './FormRenderer';
import { CardRenderer } from './CardRenderer';

// Component registry mapping response types to renderer components
const COMPONENT_REGISTRY = {
    text: TextRenderer,
    table: TableRenderer,
    form: FormRenderer,
    card: CardRenderer,
    action_buttons: TextRenderer, // Fallback to text for now
    chart: TextRenderer,          // Fallback to text for now
};

interface AIMessageRendererProps {
    response: AIResponse;
    onAction?: (action: string, data?: any) => void;
}

/**
 * AIMessageRenderer - Main renderer that delegates to specific component types
 * 
 * Automatically selects the appropriate renderer based on response type
 */
export function AIMessageRenderer({ response, onAction }: AIMessageRendererProps) {
    const Renderer = COMPONENT_REGISTRY[response.type] || TextRenderer;

    console.log('🎨 [AIMessageRenderer]', {
        responseType: response.type,
        responseContent: response.content,
        selectedRenderer: Renderer.name,
        fullResponse: response
    });

    return (
        <div className="ai-message-renderer">
            <Renderer content={response.content} onAction={onAction} onSubmit={onAction} />
        </div>
    );
}

/**
 * Utility function to parse AI response from string or object
 */
export function parseAIResponse(content: any): AIResponse {
    console.log('🔍 [parseAIResponse] INPUT:', { content, type: typeof content });

    // If already an AIResponse object
    if (content && typeof content === 'object' && content.type && content.content) {
        console.log('✅ [parseAIResponse] Already AIResponse object');
        return content as AIResponse;
    }

    // If string, try to parse as JSON
    if (typeof content === 'string') {
        try {
            const parsed = JSON.parse(content);
            console.log('🔄 [parseAIResponse] Parsed JSON:', parsed);
            if (parsed.type && parsed.content) {
                console.log('✅ [parseAIResponse] Valid AIResponse from JSON');
                return parsed as AIResponse;
            }
        } catch (e) {
            console.log('⚠️ [parseAIResponse] Not JSON, treating as text');
        }
        const textResponse: AIResponse = { type: 'text' as const, content };
        console.log('📝 [parseAIResponse] Returning text response:', textResponse);
        return textResponse;
    }

    // Fallback: stringify unknown types
    const fallbackResponse: AIResponse = {
        type: 'text' as const,
        content: typeof content === 'object' ? JSON.stringify(content, null, 2) : String(content)
    };
    console.log('🔄 [parseAIResponse] Fallback response:', fallbackResponse);
    return fallbackResponse;
}

// Export individual renderers for direct use
export { TextRenderer } from './TextRenderer';
export { TableRenderer } from './TableRenderer';
export { FormRenderer } from './FormRenderer';
export { CardRenderer } from './CardRenderer';
