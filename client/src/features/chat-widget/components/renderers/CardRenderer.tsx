import type { CardContent } from '../../../../types/aiResponse';
import { Button } from '../../../../components/ui/button';
import { cn } from '../../../../components/ui/utils';

interface CardRendererProps {
    content: CardContent;
    onAction?: (action: string, data?: any) => void;
}

/**
 * CardRenderer - Renders information as a styled card
 */
export function CardRenderer({ content, onAction }: CardRendererProps) {
    const variantStyles = {
        default: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
        success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950',
        warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950',
        error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950',
    };

    return (
        <div
            className={cn(
                'border rounded-lg p-4 space-y-3',
                variantStyles[content.variant || 'default']
            )}
        >
            {/* Header */}
            <div>
                {content.icon && (
                    <div className="text-3xl mb-2">{content.icon}</div>
                )}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {content.title}
                </h3>
                {content.subtitle && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {content.subtitle}
                    </p>
                )}
            </div>

            {/* Fields */}
            <dl className="space-y-2">
                {Object.entries(content.fields).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center gap-4">
                        <dt className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                            {key}:
                        </dt>
                        <dd className="text-gray-900 dark:text-gray-100 text-sm font-semibold text-right">
                            {value !== null && value !== undefined ? String(value) : '-'}
                        </dd>
                    </div>
                ))}
            </dl>

            {/* Actions */}
            {content.actions && content.actions.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-2 border-t border-gray-200 dark:border-gray-700">
                    {content.actions.map((action, idx) => (
                        <Button
                            key={idx}
                            onClick={() => onAction?.(action.action, action.data)}
                            variant={action.variant === 'danger' ? 'destructive' : action.variant === 'primary' ? 'default' : 'outline'}
                            size="sm"
                        >
                            {action.label}
                        </Button>
                    ))}
                </div>
            )}
        </div>
    );
}
