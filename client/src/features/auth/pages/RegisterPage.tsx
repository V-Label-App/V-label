import { Link } from 'react-router-dom';
import { AuthSplitLayout } from '../../../layouts/AuthSplitLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { logger } from '../../../utils/logger';

export const RegisterPage = () => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        logger.info('Register form submitted');
    };

    return (
        <AuthSplitLayout
            title="Join our community"
            subtitle="Start your journey with us today. Create an account to unlock all features."
        >
            <div className="space-y-8">
                <div className="text-center lg:text-left">
                    <h2 className="text-3xl font-bold text-gray-900">Create an account</h2>
                    <p className="mt-2 text-gray-600">Enter your details to sign up</p>
                </div>

                <div className="space-y-4">
                    <Button
                        fullWidth
                        variant="outline"
                        icon={<img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />}
                    >
                        Sign up with Google
                    </Button>

                    <Button
                        fullWidth
                        variant="black"
                        icon={<img src="https://www.svgrepo.com/show/512317/github-142.svg" className="w-5 h-5 invert" alt="Apple" />}
                    >
                        Sign up with Apple
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or sign up with email</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Full Name"
                        type="text"
                        placeholder="John Doe"
                    />

                    <Input
                        label="Email address"
                        type="email"
                        placeholder="you@example.com"
                    />

                    <Input
                        label="Password"
                        type="password"
                        placeholder="••••••••"
                    />

                    <Input
                        label="Confirm Password"
                        type="password"
                        placeholder="••••••••"
                    />

                    <Button type="submit" fullWidth>
                        Create account
                    </Button>
                </form>

                <p className="text-center text-sm text-gray-600">
                    Already have an account?{' '}
                    <Link to="/login" className="font-medium text-purple-600 hover:text-purple-500">
                        Log in
                    </Link>
                </p>
            </div>
        </AuthSplitLayout>
    );
};
