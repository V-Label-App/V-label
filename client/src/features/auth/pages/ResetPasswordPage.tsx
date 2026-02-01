import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoUrl from '../../../assets/android-chrome-192x192.png';
import { authApi } from '../../../services/auth.api';
import { logger } from '../../../utils/logger';

export const ResetPasswordPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    // State
    const [isVerifyingToken, setIsVerifyingToken] = useState(true);
    const [tokenError, setTokenError] = useState('');
    const [userEmail, setUserEmail] = useState('');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    // Token Verification
    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setTokenError('Invalid reset link. Token is missing.');
                setIsVerifyingToken(false);
                return;
            }

            try {
                const result = await authApi.verifyResetToken(token);
                if (result.valid) {
                    setUserEmail(result.email || '');
                } else {
                    setTokenError(result.error || 'This reset link has expired or is invalid.');
                }
            } catch (err: any) {
                setTokenError('Failed to verify reset link. Please try requesting a new one.');
            } finally {
                setIsVerifyingToken(false);
            }
        };

        verifyToken();
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 3) {
            setError('Password must be at least 3 characters');
            return;
        }

        setIsLoading(true);

        try {
            if (!token) throw new Error('Token is missing');
            await authApi.resetPassword(token, password);
            setIsSuccess(true);
            logger.info('Password reset successfully');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Failed to reset password. Please try again.';
            setError(errorMsg);
            logger.error('Reset password failed:', errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // Password strength check
    const getPasswordStrength = () => {
        if (!password) return { label: 'None', color: 'bg-slate-200', width: '0%' };
        if (password.length < 3) return { label: 'Too short', color: 'bg-red-500', width: '33%' };
        if (password.length < 8) return { label: 'Medium', color: 'bg-amber-500', width: '66%' };
        return { label: 'Strong', color: 'bg-emerald-500', width: '100%' };
    };

    const strength = getPasswordStrength();

    if (isVerifyingToken) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-slate-500 font-medium">Verifying reset link...</p>
            </div>
        );
    }

    if (tokenError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center"
                >
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border border-red-100">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Link Invalid or Expired</h2>
                    <p className="text-slate-500 mb-8">{tokenError}</p>
                    <Link to="/forgot-password" className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all font-medium w-full">
                        Request new link
                    </Link>
                    <div className="mt-6">
                        <Link to="/login" className="text-sm font-medium text-slate-400 hover:text-slate-600 inline-flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4" /> Back to log in
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-white p-3 rounded-2xl shadow-xl mb-4 border border-slate-100">
                        <img
                            src={logoUrl}
                            alt="VLabel Logo"
                            className="w-12 h-12 rounded-lg"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900">VLabel</h1>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-8">
                    <AnimatePresence mode="wait">
                        {!isSuccess ? (
                            <motion.div
                                key="reset-form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Set new password</h2>
                                    <p className="text-slate-500 text-sm">
                                        Resetting password for <span className="font-semibold text-slate-700">{userEmail}</span>
                                    </p>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="password" title="New Password">New Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className="pl-10 h-12 border-slate-200 focus:border-blue-500 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {/* Strength meter */}
                                        <div className="space-y-1 mt-2">
                                            <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                                                <span>Strength: <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span></span>
                                                <span>Min. 3 characters</span>
                                            </div>
                                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: strength.width }}
                                                    className={`h-full ${strength.color} transition-all duration-500`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <Input
                                                id="confirmPassword"
                                                type={showPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className="pl-10 h-12 border-slate-200 focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-200 mt-2"
                                    >
                                        {isLoading ? 'Resetting...' : 'Reset password'}
                                    </Button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success-state"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-6 py-4"
                            >
                                <div className="flex justify-center">
                                    <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-100">
                                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-semibold text-slate-900">Password reset</h2>
                                    <p className="text-slate-500 text-sm">
                                        Your password has been successfully reset.
                                        Redirecting to login...
                                    </p>
                                </div>
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-2 text-sm text-blue-600 font-medium animate-pulse">
                                        <ShieldCheck className="w-4 h-4" />
                                        Secure login optimized
                                    </div>
                                </div>
                                <Button
                                    onClick={() => navigate('/login')}
                                    className="w-full h-11 bg-slate-900 hover:bg-slate-800"
                                >
                                    Login now
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
