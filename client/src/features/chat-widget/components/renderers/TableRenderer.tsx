import type { TableContent } from '../../../../types/aiResponse';
import { Button } from '../../../../components/ui/button';

interface TableRendererProps {
    content: TableContent;
    onAction?: (action: string, data?: any) => void;
}

/**
 * TableRenderer - Renders data as an interactive table
 */
export function TableRenderer({ content, onAction }: TableRendererProps) {
    return (
        <div className="space-y-3 w-full max-w-full">
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 max-w-full">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                            {content.headers.map((header, idx) => (
                                <th
                                    key={idx}
                                    className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider"
                                >
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:border-gray-700">
                        {content.rows.map((row, rowIdx) => (
                            <tr
                                key={rowIdx}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                {row.map((cell, cellIdx) => (
                                    <td
                                        key={cellIdx}
                                        className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 whitespace-nowrap"
                                    >
                                        {cell !== null && cell !== undefined ? String(cell) : '-'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {content.actions && content.actions.length > 0 && (
                <div className="flex gap-2 flex-wrap">
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
