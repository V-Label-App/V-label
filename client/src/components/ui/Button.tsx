import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'black';
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export const Button = ({
    children,
    variant = 'primary',
    icon,
    fullWidth = false,
    className = '',
    ...props
}: ButtonProps) => {
    const baseStyles = 'inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 shadow-md hover:shadow-lg',
        black: 'bg-black text-white hover:bg-gray-800 shadow-sm',
        outline: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${widthStyles} ${className}`}
            {...props}
        >
            {icon && <span className="mr-3">{icon}</span>}
            {children}
        </button>
    );
};
