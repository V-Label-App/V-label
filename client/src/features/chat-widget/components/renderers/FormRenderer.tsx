import type { FormContent } from '../../../../types/aiResponse';
import { useState } from 'react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';

interface FormRendererProps {
    content: FormContent;
    onSubmit?: (action: string, data: any) => void;
}

/**
 * FormRenderer - Renders an interactive form with validation
 */
export function FormRenderer({ content, onSubmit }: FormRendererProps) {
    const [formData, setFormData] = useState<Record<string, any>>(() => {
        // Initialize with default values
        const initial: Record<string, any> = {};
        content.fields.forEach(field => {
            if (field.defaultValue !== undefined) {
                initial[field.name] = field.defaultValue;
            }
        });
        return initial;
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (name: string, value: any) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        content.fields.forEach(field => {
            const value = formData[field.name];

            // Required validation
            if (field.required && (!value || String(value).trim() === '')) {
                newErrors[field.name] = `${field.label} is required`;
                return;
            }

            // MinLength validation
            if (field.minLength && value && String(value).length < field.minLength) {
                newErrors[field.name] = `${field.label} must be at least ${field.minLength} characters`;
                return;
            }

            // MaxLength validation
            if (field.maxLength && value && String(value).length > field.maxLength) {
                newErrors[field.name] = `${field.label} must be at most ${field.maxLength} characters`;
                return;
            }

            // Pattern validation
            if (field.pattern && value) {
                const regex = new RegExp(field.pattern);
                if (!regex.test(String(value))) {
                    newErrors[field.name] = `${field.label} format is invalid`;
                    return;
                }
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit?.(content.id, formData);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {content.title}
                </h3>
                {content.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {content.description}
                    </p>
                )}
            </div>

            {/* Fields */}
            {content.fields.map(field => (
                <div key={field.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {field.type === 'select' ? (
                        <select
                            value={formData[field.name] || ''}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isSubmitting}
                        >
                            <option value="">Select {field.label}...</option>
                            {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    ) : field.type === 'textarea' ? (
                        <textarea
                            value={formData[field.name] || ''}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isSubmitting}
                        />
                    ) : (
                        <Input
                            type={field.type}
                            value={formData[field.name] || ''}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={isSubmitting}
                        />
                    )}

                    {field.helpText && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {field.helpText}
                        </p>
                    )}

                    {errors[field.name] && (
                        <p className="text-xs text-red-500 mt-1">
                            {errors[field.name]}
                        </p>
                    )}
                </div>
            ))}

            {/* Submit Button */}
            <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
            >
                {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
        </form>
    );
}
