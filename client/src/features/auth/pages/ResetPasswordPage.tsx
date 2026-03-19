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
import { toast } from 'sonner';

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
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
            } catch {
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

        // FE-level Password History (Block 1 turn)
        const lastPwdHash = localStorage.getItem(`vlabel_last_pwd_${userEmail}`);
        if (lastPwdHash && btoa(password) === lastPwdHash) {
            setError('You cannot reuse your current password. Please choose a different one.');
            toast.warning('Security Policy: Password reuse detected');
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            setError('Password does not meet the security requirements');
            return;
        }

        setIsLoading(true);

        try {
            if (!token) throw new Error('Token is missing');
            await authApi.resetPassword(token, password);
            
            // Store this password as "last used" to prevent immediate reuse
            localStorage.setItem(`vlabel_last_pwd_${userEmail}`, btoa(password));
            
            setIsSuccess(true);
            logger.info('Password reset successfully');

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: unknown) {
            const errorMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reset password. Please try again.';
            setError(errorMsg);
            logger.error('Reset password failed:', errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    // Password strength check
    const getPasswordStats = () => {
        const stats = {
            length: password.length >= 8,
            hasUpper: /[A-Z]/.test(password),
            hasLower: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[@$!%*?&]/.test(password),
        };
        
        const strengthCount = Object.values(stats).filter(Boolean).length;
        
        let label = 'None';
        let color = 'bg-slate-200';
        let width = '0%';
        
        if (password) {
            if (strengthCount <= 2) { label = 'Weak'; color = 'bg-red-500'; width = '25%'; }
            else if (strengthCount <= 3) { label = 'Medium'; color = 'bg-amber-500'; width = '50%'; }
            else if (strengthCount <= 4) { label = 'Strong'; color = 'bg-blue-500'; width = '75%'; }
            else { label = 'Very Strong'; color = 'bg-emerald-500'; width = '100%'; }
        }
        
        return { label, color, width, stats };
    };

    const passwordStats = getPasswordStats();
    const isPasswordMatching = confirmPassword.length > 0 && password === confirmPassword;

    if (isVerifyingToken) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] gap-4">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-slate-400 font-medium tracking-tight">Verifying secure transmission...</p>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className={`min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#0f172a]`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 p-10 text-center relative z-10"
                >
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center border border-emerald-500/30 backdrop-blur-md">
                            <ShieldCheck className="w-10 h-10 text-emerald-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Password Reset Successful!</h2>
                    <p className="text-slate-400 mb-8 font-medium">Your access key has been updated. Redirecting to secure gateway...</p>
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
                    <div className="mt-8">
                        <Link to="/login" className="text-sm font-semibold text-slate-500 hover:text-white inline-flex items-center gap-2 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to secure gateway
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    if (tokenError) {
        return (
            <div className={`min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-[#0f172a]`}>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-white/10 backdrop-blur-2xl rounded-[2.5rem] shadow-2xl border border-white/10 p-10 text-center relative z-10"
                >
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 bg-red-500/20 rounded-3xl flex items-center justify-center border border-red-500/30 backdrop-blur-md">
                            <AlertCircle className="w-10 h-10 text-red-400" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-8 font-medium">{tokenError}</p>
                    <Link to="/forgot-password" title="Request new link" className="flex items-center justify-center h-14 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-700 hover:to-rose-700 transition-all font-bold w-full shadow-lg shadow-red-900/20">
                        Re-request Access
                    </Link>
                    <div className="mt-8">
                        <Link to="/login" className="text-sm font-semibold text-slate-500 hover:text-white inline-flex items-center gap-2 transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to secure gateway
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 py-12 relative overflow-hidden font-sans">
            {/* Immersive Background Elements - Synced with ForgotPassword */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5 pointer-events-none"></div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="flex flex-col items-center mb-10">
                    <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="bg-white/10 backdrop-blur-md p-4 rounded-3xl shadow-2xl mb-4 border border-white/20"
                    >
                        <img
                            src={logoUrl}
                            alt="VLabel Logo"
                            className="w-14 h-14 rounded-2xl"
                        />
                    </motion.div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">VLabel</h1>
                    <div className="h-1 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
                </div>

                <div className="bg-white/10 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 p-10 overflow-hidden relative">
                    {/* Top Accent Ring */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"></div>
                    
                    <AnimatePresence mode="wait">
                        {!isSuccess ? (
                            <motion.div
                                key="reset-form"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-8"
                            >
                                <div className="text-center space-y-2">
                                    <h2 className="text-2xl font-bold text-white mb-1">Set Security Credentials</h2>
                                    <p className="text-slate-400 text-sm font-medium">
                                        Defining new access protocols for <br />
                                        <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-md mt-1 inline-block">{userEmail}</span>
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
                                        <Label htmlFor="password" title="New Password" className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Primary Access Key</Label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors z-10" />
                                            <Input
                                                id="password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className="pl-12 pr-12 h-14 bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-2xl focus:border-blue-500/50 focus:ring-0 transition-all backdrop-blur-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-20"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        
                                        {/* Strength meter - Dark Mode Optimized */}
                                        <div className="space-y-3 mt-4 bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                                            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                                                <span>Security Level: <span className={passwordStats.color.replace('bg-', 'text-')}>{passwordStats.label}</span></span>
                                                <span>{Math.round(parseInt(passwordStats.width))}% Secure</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden shadow-inner">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: passwordStats.width }}
                                                    className={`h-full ${passwordStats.color} transition-all duration-500 shadow-[0_0_10px_rgba(37,99,235,0.3)]`}
                                                />
                                            </div>
                                            
                                            {/* Checklist */}
                                            <div className="grid grid-cols-2 gap-y-2 pt-1">
                                                {[
                                                    { label: 'Min 8 chars', met: passwordStats.stats.length },
                                                    { label: 'Uppercase', met: passwordStats.stats.hasUpper },
                                                    { label: 'Lowercase', met: passwordStats.stats.hasLower },
                                                    { label: 'Number', met: passwordStats.stats.hasNumber },
                                                    { label: 'Special char', met: passwordStats.stats.hasSpecial },
                                                ].map((req, idx) => (
                                                    <div key={idx} className="flex items-center gap-2">
                                                        <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors duration-300 ${req.met ? 'bg-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white/5'}`}>
                                                            <CheckCircle2 className={`w-3 h-3 ${req.met ? 'text-white' : 'text-slate-700'}`} />
                                                        </div>
                                                        <span className={`text-[10px] font-bold tracking-tight ${req.met ? 'text-blue-400' : 'text-slate-600'}`}>{req.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="confirmPassword" title="Verify Access Key" className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Confirm Access Key</Label>
                                        <div className="relative group">
                                            <div className={`absolute inset-0 rounded-2xl blur-md opacity-0 group-focus-within:opacity-100 transition-opacity ${confirmPassword ? (isPasswordMatching ? 'bg-emerald-500/20' : 'bg-red-500/20') : 'bg-blue-500/20'}`}></div>
                                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors z-10 ${confirmPassword ? (isPasswordMatching ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400 group-focus-within:text-blue-400'}`} />
                                            <Input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                                disabled={isLoading}
                                                className={`pl-12 pr-12 h-14 bg-white/5 text-white placeholder:text-slate-500 rounded-2xl focus:ring-0 transition-all backdrop-blur-sm ${
                                                    confirmPassword 
                                                        ? (isPasswordMatching ? 'border-emerald-500/40 focus:border-emerald-500/60' : 'border-red-500/40 focus:border-red-500/60')
                                                        : 'border-white/10 focus:border-blue-500/50'
                                                }`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors z-20"
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {confirmPassword && !isPasswordMatching && (
                                            <motion.p 
                                                initial={{ opacity: 0, y: -5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="text-[10px] font-bold text-red-500 pl-1 uppercase tracking-wider"
                                            >
                                                Key Signature Mismatch
                                            </motion.p>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.3)] hover:shadow-blue-500/40 transition-all duration-300 mt-2"
                                    >
                                        {isLoading ? (
                                            <span className="flex items-center gap-2">
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Synchronizing...
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-2 justify-center">
                                                Confirm New Key
                                                <ShieldCheck className="w-5 h-5" />
                                            </span>
                                        )}
                                    </Button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="success-state"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-8 py-4"
                            >
                                <div className="flex justify-center">
                                    <motion.div 
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: "spring", damping: 12, stiffness: 200 }}
                                        className="w-24 h-24 bg-emerald-500/20 rounded-[2rem] flex items-center justify-center border border-emerald-500/30 backdrop-blur-md shadow-[0_0_50px_rgba(16,185,129,0.2)]"
                                    >
                                        <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                                    </motion.div>
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-bold text-white tracking-tight">Key Reset Success!</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed max-w-[280px] mx-auto">
                                        Your access credentials have been <br />
                                        successfully re-indexed.
                                    </p>
                                </div>
                                <div className="flex justify-center">
                                    <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-widest bg-blue-500/10 px-4 py-2 rounded-xl animate-pulse">
                                        <ShieldCheck className="w-4 h-4" />
                                        Secure gateway ready
                                    </div>
                                </div>
                                <Button
                                    onClick={() => navigate('/login')}
                                    className="w-full h-14 bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-2xl shadow-xl transition-all"
                                >
                                    Proceed to Login
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};
