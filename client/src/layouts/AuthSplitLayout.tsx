import type { ReactNode } from 'react';

interface AuthSplitLayoutProps {
    children: ReactNode;
    image?: string;
    title?: string;
    subtitle?: string;
}

export const AuthSplitLayout = ({
    children,
    title = "Collaborate seamlessly",
    subtitle = "Work together with your team in real-time, from anywhere in the world."
}: AuthSplitLayoutProps) => {
    return (
        <div className="min-h-screen w-full flex bg-white">
            {/* Left Side - Image/Gradient */}
            <div className="hidden lg:flex w-1/2 relative bg-purple-900 overflow-hidden">
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/90 to-purple-900/90 z-10" />

                {/* Background Pattern/Image Placeholder */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundImage: 'url("https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2000&q=80")',
                        mixBlendMode: 'overlay'
                    }}
                />

                {/* Content */}
                <div className="relative z-20 flex flex-col justify-end p-16 w-full text-white">
                    <h1 className="text-4xl font-bold mb-4">{title}</h1>
                    <p className="text-lg text-purple-100 max-w-md">{subtitle}</p>

                    {/* Pagination Dots Simulator */}
                    <div className="flex space-x-2 mt-8">
                        <div className="w-8 h-2 bg-white rounded-full" />
                        <div className="w-2 h-2 bg-purple-300 rounded-full" />
                        <div className="w-2 h-2 bg-purple-300 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
                <div className="w-full max-w-md">
                    {children}
                </div>
            </div>
        </div>
    );
};
