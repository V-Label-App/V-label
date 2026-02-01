import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import logoUrl from '../../../assets/android-chrome-192x192.png';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '../../../services/auth.api';
import { logger } from '../../../utils/logger';

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await authApi.forgotPassword(email);
            setIsSubmitted(true);
            logger.info('Password reset request sent for:', email);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Failed to request password reset. Please try again.';
            setError(errorMsg);
            logger.error('Forgot password failed:', errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-8">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="bg-white p-3 rounded-2xl shadow-xl mb-4 border border-slate-100"
                    >
                        <img
                            src={logoUrl}
                            alt="VLabel Logo"
                            className="w-12 h-12 rounded-lg"
                        />
                    </motion.div>
                    <h1 className="text-3xl font-bold text-slate-900">VLabel</h1>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-100 p-8">
                    <AnimatePresence mode="wait">
                        {!isSubmitted ? (
                            <motion.div
                                key="request-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                <div className="text-center">
                                    <h2 className="text-2xl font-semibold text-slate-900 mb-2">Forgot password?</h2>
                                    <p className="text-slate-500">
                                        No worries, we'll send you reset instructions.
                                    </p>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                                    >
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{error}</span>
                                    </motion.div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className="pl-10 h-12 border-slate-200 focus:border-blue-500 transition-all"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-200"
                                    >
                                        {isLoading ? 'Sending instructions...' : 'Reset password'}
                                    </Button>
                                </form>

                                <div className="pt-2 text-center">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back to log in
                                    </Link>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success-message"
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
                                    <h2 className="text-2xl font-semibold text-slate-900">Check your email</h2>
                                    <p className="text-slate-500 text-sm leading-relaxed px-4">
                                        We sent a password reset link to <span className="font-semibold text-slate-900">{email}</span>
                                    </p>
                                </div>

                                <div className="pt-4 flex flex-col gap-4">
                                    <Button
                                        onClick={() => window.open('mailto:', '_blank')}
                                        className="h-11 bg-slate-900 text-white hover:bg-slate-800"
                                    >
                                        Open email app
                                    </Button>
                                    <Button
                                        onClick={() => setIsSubmitted(false)}
                                        variant="outline"
                                        className="h-11 border-slate-200"
                                    >
                                        Didn't receive the email? Click to resubmit
                                    </Button>
                                </div>

                                <div className="pt-2">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                        Back to log in
                                    </Link>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="mt-8 text-center"
                >
                    <p className="text-slate-400 text-xs flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        VLabel Enterprise Intelligence Security
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
};
