import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthSplitLayout } from '../../../layouts/AuthSplitLayout';
import { Button } from '../../../components/ui/button';
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { logger } from '../../../utils/logger';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'sonner';
import { authApi } from '../../../services/auth.api';

export const RegisterPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Client-side validation
        if (password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            // Call API directly without using register from context (no auto-login)
            await authApi.register({ email, password, fullName: fullName || undefined });
            logger.info('Registration successful');
            toast.success('Account created successfully! Please login.');
            // Redirect to login page
            setTimeout(() => navigate('/login'), 1000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Registration failed. Please try again.';
            setError(errorMsg);
            toast.error(errorMsg);
            logger.error('Registration failed:', errorMsg);
        } finally {
            setIsLoading(false);
        }
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
                        className="w-full"
                        variant="outline"
                        disabled
                    >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5 mr-2" alt="Google" />
                        Sign up with Google
                    </Button>

                    <Button
                        className="w-full bg-black text-white hover:bg-gray-800"
                        disabled
                    >
                        <img src="https://www.svgrepo.com/show/512317/github-142.svg" className="w-5 h-5 mr-2 invert" alt="Github" />
                        Sign up with Github
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
                    <div className="space-y-1">
                        <Label htmlFor="fullName">Full Name (Optional)</Label>
                        <Input
                            id="fullName"
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="email">Email address</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                        {password.length > 0 && password.length < 8 && (
                            <p className="text-xs text-red-500 mt-1">Minimum 8 characters</p>
                        )}
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                        {confirmPassword && password !== confirmPassword && (
                            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? 'Creating account...' : 'Create account'}
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
