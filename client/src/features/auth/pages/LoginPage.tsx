import { AuthSplitLayout } from '../../../layouts/AuthSplitLayout';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { logger } from '../../../utils/logger';

export const LoginPage = () => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        logger.info('Login form submitted');
    };

    return (
        <AuthSplitLayout>
            <div className="space-y-8">
                <div className="text-center lg:text-left">
                    <h2 className="text-3xl font-bold text-gray-900">Welcome back!</h2>
                    <p className="mt-2 text-gray-600">Enter your credentials to access your account</p>
                </div>

                <div className="space-y-4">
                    <Button
                        fullWidth
                        variant="outline"
                        icon={<img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />}
                    >
                        Continue with Google
                    </Button>

                    <Button
                        fullWidth
                        variant="black"
                        icon={<img src="https://www.svgrepo.com/show/512317/github-142.svg" className="w-5 h-5 invert" alt="Apple" />}
                    >
                        Continue with Apple
                    </Button>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
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

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-medium text-purple-600 hover:text-purple-500">
                                Forgot your password?
                            </a>
                        </div>
                    </div>

                    <Button type="submit" fullWidth>
                        Log in
                    </Button>
                </form>

                <p className="text-center text-sm text-gray-600">
                    Don't have an account?{' '}
                    <a href="#" className="font-medium text-purple-600 hover:text-purple-500">
                        Sign up
                    </a>
                </p>
            </div>
        </AuthSplitLayout>
    );
};
