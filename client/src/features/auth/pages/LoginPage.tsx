import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { Shield, Users, CheckCircle, Pencil, Eye, EyeOff, AlertCircle, Sparkles, ShieldCheck, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { logger } from '../../../utils/logger';

import { TypewriterText } from '../../../components/ui/typewriter-effect';
import { GoogleLoginButton } from '../../../components/GoogleLoginButton';

export const LoginPage = () => {
    const navigate = useNavigate();
    const { login, devLogin, isAuthenticated } = useAuth();

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingDevRole, setLoadingDevRole] = useState<string | null>(null);

    // Redirect if already logged in
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    // Load remembered email
    useEffect(() => {
        const rememberedEmail = localStorage.getItem('rememberedEmail');
        if (rememberedEmail) {
            setEmail(rememberedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password, rememberMe);
            logger.info('Login successful');
            navigate('/');
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Login failed. Please try again.';
            setError(errorMsg);
            logger.error('Login failed:', errorMsg);
        } finally {
            setIsLoading(false);
        }
    };


    const handleDevLogin = async (role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR') => {
        setError('');
        setLoadingDevRole(role);
        try {
            await devLogin(role);
            logger.info(`Dev login successful as ${role}`);
            navigate('/');
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Dev login failed.';
            setError(errorMsg);
        } finally {
            setLoadingDevRole(null);
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
                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center px-12 pb-20">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.8 }}
                    >
                        <TypewriterText
                            texts={["Welcome back!", "Data Labeling", "Manage Projects"]}
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

                        {/* Stats Card */}
                        {/* AI Stats Card */}
                        {/* AI Capabilities Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-blue-400" />
                                    <h3 className="text-white font-medium text-sm">AI Support</h3>
                                </div>
                                <div className="flex gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/50" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                                </div>
                            </div>

                            {/* Minimal Visualization */}
                            <div className="relative h-48 w-full bg-gradient-to-b from-slate-900/50 to-slate-900/80 flex items-center justify-center overflow-hidden">
                                {/* Abstract Subject */}
                                <div className="absolute w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>

                                {/* Radar/Scan Effect */}
                                <motion.div
                                    className="absolute inset-0 bg-gradient-to-t from-blue-500/10 to-transparent"
                                    animate={{ top: ['100%', '-100%'] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                />

                                {/* Detection Box */}
                                <motion.div
                                    className="relative z-10 w-40 h-28 rounded-lg border border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-400/5 backdrop-blur-[1px]"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        repeatType: "reverse",
                                        ease: "easeInOut"
                                    }}
                                >
                                    {/* Minimal corners */}
                                    <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-blue-400"></div>
                                    <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-blue-400"></div>
                                    <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-blue-400"></div>
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-blue-400"></div>

                                    {/* Floating Label - Ultra Clean */}
                                    <motion.div
                                        className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-slate-700 text-xs py-1 px-3 rounded-full text-blue-100 flex items-center gap-2 shadow-xl whitespace-nowrap"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5, duration: 0.5 }}
                                    >
                                        <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                                        <span>Anomaly Detected</span>
                                        <span className="text-slate-500">|</span>
                                        <span className="font-mono text-blue-400">98%</span>
                                    </motion.div>
                                </motion.div>
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

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center px-8 py-12 bg-white">
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">V</span>
                        </div>
                        <h1 className="text-2xl font-semibold">VLabel</h1>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="mb-8"
                    >
                        <h2 className="text-3xl font-semibold mb-2">Sign in to VLabel</h2>
                        <p className="text-slate-500">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-blue-600 font-medium hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </motion.div>

                    <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        {/* Error Message */}
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* Email Input */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="h-12 bg-white border-slate-300 focus:border-blue-500"
                            />
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
                                    className="h-12 bg-white border-slate-300 focus:border-blue-500 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="remember"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                />
                                <label htmlFor="remember" className="text-sm text-slate-700 cursor-pointer">
                                    Remember me
                                </label>
                            </div>
                            <button
                                type="button"
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Sign In Button */}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium text-base"
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
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

                    {/* Google Sign In */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6, duration: 0.6 }}
                    >
                        <GoogleLoginButton />
                    </motion.div>

                    {/* Quick Login - Demo Mode */}
                    {import.meta.env.MODE === 'development' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7, duration: 0.6 }}
                            className="mt-8 p-5 bg-blue-50 border border-blue-200 rounded-xl"
                        >
                            <p className="text-xs text-blue-800 font-semibold mb-3 text-center">Quick Login - Demo Mode</p>
                            <div className="grid grid-cols-2 gap-2">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full h-auto py-3 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 border-blue-300 ${loadingDevRole === 'ADMIN' ? 'opacity-75 cursor-wait' : ''}`}
                                        onClick={() => handleDevLogin('ADMIN')}
                                        disabled={loadingDevRole !== null}
                                    >
                                        <Shield className="w-5 h-5 text-red-600" />
                                        <div className="text-center">
                                            <p className="text-xs font-semibold">Admin</p>
                                            <p className="text-[10px] text-muted-foreground">User Mgmt</p>
                                        </div>
                                    </Button>
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full h-auto py-3 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 border-blue-300 ${loadingDevRole === 'MANAGER' ? 'opacity-75 cursor-wait' : ''}`}
                                        onClick={() => handleDevLogin('MANAGER')}
                                        disabled={loadingDevRole !== null}
                                    >
                                        <Users className="w-5 h-5 text-blue-600" />
                                        <div className="text-center">
                                            <p className="text-xs font-semibold">Manager</p>
                                            <p className="text-[10px] text-muted-foreground">Tasks</p>
                                        </div>
                                    </Button>
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full h-auto py-3 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 border-blue-300 ${loadingDevRole === 'REVIEWER' ? 'opacity-75 cursor-wait' : ''}`}
                                        onClick={() => handleDevLogin('REVIEWER')}
                                        disabled={loadingDevRole !== null}
                                    >
                                        <CheckCircle className="w-5 h-5 text-purple-600" />
                                        <div className="text-center">
                                            <p className="text-xs font-semibold">Reviewer</p>
                                            <p className="text-[10px] text-muted-foreground">QA</p>
                                        </div>
                                    </Button>
                                </motion.div>

                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className={`w-full h-auto py-3 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 border-blue-300 ${loadingDevRole === 'ANNOTATOR' ? 'opacity-75 cursor-wait' : ''}`}
                                        onClick={() => handleDevLogin('ANNOTATOR')}
                                        disabled={loadingDevRole !== null}
                                    >
                                        <Pencil className="w-5 h-5 text-green-600" />
                                        <div className="text-center">
                                            <p className="text-xs font-semibold">Annotator</p>
                                            <p className="text-[10px] text-muted-foreground">Label</p>
                                        </div>
                                    </Button>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </div>
        </div>
    );
};
