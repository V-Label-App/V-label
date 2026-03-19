import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Mail, ArrowLeft, AlertCircle, CheckCircle2, Shield, Send } from 'lucide-react';
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
        } catch (err: unknown) {
            const errorResponse = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            const errorMsg = errorResponse || 'Failed to request password reset. Please try again.';
            setError(errorMsg);
            logger.error('Forgot password failed:', errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#0f172a]">
            {/* Immersive Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="w-full max-w-md relative z-10"
            >
                {/* Logo Section */}
                <div className="flex flex-col items-center mb-10">
                    <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="bg-white/10 backdrop-blur-md p-4 rounded-3xl shadow-2xl mb-4 border border-white/20"
                    >
                        <img
                            src={logoUrl}
                            alt="VLabel Logo"
                            className="w-14 h-14 rounded-2xl shadow-inner"
                        />
                    </motion.div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">VLabel</h1>
                    <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
                </div>

                <div className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 p-10 overflow-hidden relative">
                    {/* Top Accent Ring */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                    
                    <AnimatePresence mode="wait">
                        {!isSubmitted ? (
                            <motion.div
                                key="request-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-8"
                            >
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-bold text-white mb-2">Password Recovery</h2>
                                    <p className="text-slate-400 text-sm font-medium">
                                        Enter your email below and we'll send you <br /> high-priority reset instructions.
                                    </p>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 text-sm text-red-100 bg-red-500/20 border border-red-500/30 rounded-2xl flex items-center gap-3 backdrop-blur-md"
                                    >
                                        <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                                        <span className="font-medium">{error}</span>
                                    </motion.div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-3">
                                        <Label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Target Account Email</Label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors z-10" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@company.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className="pl-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-2xl focus:border-blue-500/50 focus:ring-0 transition-all backdrop-blur-sm"
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-blue-500/40 transition-all duration-300"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Encrypting Request...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 justify-center">
                                                Send Reset Instructions
                                                <Send className="w-5 h-5" />
                                            </span>
                                        )}
                                    </Button>
                                </form>

                                <div className="text-center">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-400 transition-all duration-300 group"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        Return to Secure Gate
                                    </Link>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success-message"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-8 py-2"
                            >
                                <div className="flex justify-center">
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
                                        className="w-24 h-24 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center border border-emerald-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                                    >
                                        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                    </motion.div>
                                </div>
                                
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-bold text-white">Transmission Sent!</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                                        Check your inbox at <br />
                                        <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md mt-1 inline-block">{email}</span>
                                    </p>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <Button
                                        onClick={() => {
                                            const domain = email.split('@')[1];
                                            if (domain === 'gmail.com') {
                                                window.open('https://mail.google.com', '_blank');
                                            } else if (domain?.includes('outlook') || domain?.includes('hotmail')) {
                                                window.open('https://outlook.live.com', '_blank');
                                            } else {
                                                window.location.href = `mailto:${email}`;
                                            }
                                        }}
                                        className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-2xl shadow-xl transition-all"
                                    >
                                        Deploy Email Client
                                    </Button>
                                    <Button
                                        onClick={() => setIsSubmitted(false)}
                                        variant="ghost"
                                        className="w-full h-12 text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl border border-white/5 transition-all"
                                    >
                                        Didn't receive it? Retransmit
                                    </Button>
                                </div>

                                <div className="pt-2">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-400 transition-all group"
                                    >
                                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                        Back to Secure Access
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
                    className="mt-12 text-center"
                >
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="h-[1px] w-8 bg-slate-800"></div>
                        <Shield className="w-4 h-4 text-slate-700" />
                        <div className="h-[1px] w-8 bg-slate-800"></div>
                    </div>
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
                        VLabel Enterprise Grade Security
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
};
