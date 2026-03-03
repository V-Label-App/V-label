import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Eye, EyeOff, AlertCircle, Sparkles, ShieldCheck, Users, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { logger } from '../../../utils/logger';
import { toast } from 'sonner';
import { authApi } from '../../../services/auth.api';
import { TypewriterText } from '../../../components/ui/typewriter-effect';
import { GoogleLoginButton } from '../../../components/GoogleLoginButton';
import logoUrl from '../../../assets/android-chrome-192x192.png';

export const RegisterPage = () => {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();

    // Form State
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
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
        setEmailError('');
        setPasswordError('');
        setConfirmPasswordError('');

        let hasError = false;

        // Validate email (Gmail only)
        if (!email) {
            setEmailError('Email is required');
            hasError = true;
        } else if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email)) {
            setEmailError('Please enter a valid email address (e.g., user@gmail.com)');
            hasError = true;
        }

        // Client-side password validation
        // Min 8 characters
        if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            hasError = true;
        }
        // At least one uppercase letter
        else if (!/[A-Z]/.test(password)) {
            setPasswordError('Password must contain at least one uppercase letter');
            hasError = true;
        }
        // At least one lowercase letter
        else if (!/[a-z]/.test(password)) {
            setPasswordError('Password must contain at least one lowercase letter');
            hasError = true;
        }
        // At least one number
        else if (!/[0-9]/.test(password)) {
            setPasswordError('Password must contain at least one number');
            hasError = true;
        }
        // At least one special character
        else if (!/[\W_]/.test(password)) {
            setPasswordError('Password must contain at least one special character (!@#$%^&*)');
            hasError = true;
        }

        // Validate confirm password
        if (password !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
            hasError = true;
        }

        if (hasError) {
            return;
        }

        setIsLoading(true);

        try {
            await authApi.register({ email, password, fullName: fullName || undefined });
            logger.info('Registration successful');
            toast.success('Account created successfully! Please login.');
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
        <div className="min-h-screen flex">
            {/* Left Side - Dark Welcome Panel */}
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col"
            >
                {/* Header with Logo */}
                {/* <div className="p-8">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                            <span className="text-slate-900 font-bold text-xl">V</span>
                        </div>
                        <h1 className="text-2xl font-semibold text-white">VLabel Portal</h1>
                    </div>
                </div> */}

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center px-12 pb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                    >
                        <TypewriterText
                            texts={["Join the Community", "Start Annotating", "Build Together"]}
                            className="text-4xl font-semibold text-white mb-8 block"
                        />

                        <div className="mb-12">
                            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-6">Platform Capabilities</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-6">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                                        <Sparkles className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-200 font-medium">Smart Annotation</h3>
                                        <p className="text-slate-400 text-sm">AI-assisted labeling tools</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-200 font-medium">Quality Control</h3>
                                        <p className="text-slate-400 text-sm">Automated review workflows</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg shrink-0">
                                        <Users className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-200 font-medium">Team Management</h3>
                                        <p className="text-slate-400 text-sm">Role-based access & insights</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-rose-500/10 rounded-lg shrink-0">
                                        <Lock className="w-5 h-5 text-rose-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-slate-200 font-medium">Data Security</h3>
                                        <p className="text-slate-400 text-sm">Enterprise-grade protection</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Trust Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex -space-x-3">
                                    <img src="https://i.pravatar.cc/100?img=1" alt="User 1" className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-600 object-cover" />
                                    <img src="https://i.pravatar.cc/100?img=2" alt="User 2" className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-500 object-cover" />
                                    <img src="https://i.pravatar.cc/100?img=3" alt="User 3" className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-400 object-cover" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Trusted by teams</p>
                                    <p className="text-sm text-slate-400">Join thousands of annotators</p>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
                </div>
            </motion.div>

            {/* Right Side - Register Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-white">
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <img
                            src={logoUrl}
                            alt="VLabel Logo"
                            className="w-10 h-10 rounded-lg"
                        />
                        <h1 className="text-2xl font-semibold">VLabel</h1>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="mb-8"
                    >
                        <h2 className="text-3xl font-semibold mb-2">Create an account</h2>
                        <p className="text-slate-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-blue-600 font-medium hover:underline">
                                Log in
                            </Link>
                        </p>
                    </motion.div>

                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* Full Name */}
                        <div className="space-y-2">
                            <Label htmlFor="fullName" className="text-sm font-medium">Full Name (Optional)</Label>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                disabled={isLoading}
                                className="h-11 bg-white border-slate-300 focus:border-blue-500"
                            />
                        </div>

                        {/* Email Input */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className={`h-11 bg-white focus:border-blue-500 ${
                                    emailError ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                                }`}
                            />
                            {emailError && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {emailError}
                                </p>
                            )}
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className={`h-11 bg-white focus:border-blue-500 pr-10 ${
                                        passwordError ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {passwordError ? (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {passwordError}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500">Min 8 chars with uppercase, lowercase, number & special character</p>
                            )}
                        </div>

                        {/* Confirm Password Input */}
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="••••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className={`h-11 bg-white focus:border-blue-500 pr-10 ${
                                        confirmPasswordError ? 'border-red-500 focus:border-red-500' : 'border-slate-300'
                                    }`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                            {confirmPasswordError && (
                                <p className="text-sm text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {confirmPasswordError}
                                </p>
                            )}
                        </div>

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium text-base mt-2"
                        >
                            {isLoading ? 'Creating account...' : 'Create account'}
                        </Button>
                    </motion.form>

                    {/* Divider */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                        className="my-6"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-white text-slate-500">OR</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Google Sign Up */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                    >
                        <GoogleLoginButton />
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
};
