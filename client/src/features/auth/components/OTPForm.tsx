import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Shield, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../context/AuthContext';
import { logger } from '../../../utils/logger';
import { toast } from 'sonner';

interface OTPFormProps {
    email: string;
    otpToken: string;
    onBack: () => void;
    onSuccess: () => void;
    onResend: () => Promise<void>;
}

export const OTPForm = ({ email, otpToken, onBack, onSuccess, onResend }: OTPFormProps) => {
    const { verifyOtp } = useAuth();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timer, setTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [error, setError] = useState('');
    
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Move to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
        if (pastedData.every(char => /^\d$/.test(char))) {
            const newOtp = [...otp];
            pastedData.forEach((char, i) => {
                newOtp[i] = char;
            });
            setOtp(newOtp);
            // Focus the last input or the next empty one
            const nextIndex = Math.min(pastedData.length, 5);
            inputRefs.current[nextIndex]?.focus();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setError('');
        setIsLoading(true);
        try {
            await verifyOtp(otpToken, code);
            logger.info('OTP verification successful');
            toast.success('Successfully verified and logged in!');
            onSuccess();
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'Invalid OTP code. Please try again.';
            setError(errorMsg);
            logger.error('OTP verification failed:', errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendClick = async () => {
        if (!canResend) return;
        
        setError('');
        setIsResending(true);
        try {
            await onResend();
            setTimer(60);
            setCanResend(false);
            logger.info('OTP resent successfully');
        } catch (err: unknown) {
            setError('Failed to resend OTP. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md"
        >
            <div className="mb-8">
                <button 
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back to login</span>
                </button>
                
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <h2 className="text-3xl font-semibold">Two-step verification</h2>
                </div>
                <p className="text-slate-500">
                    We've sent a 6-digit verification code to <span className="font-semibold text-slate-900">{email}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Error Message */}
                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
                        >
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span className="font-medium">{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="space-y-4">
                    <Label className="text-sm font-medium">Verification Code</Label>
                    <div className="flex justify-between gap-2 md:gap-4" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <Input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="h-12 w-12 md:h-14 md:w-14 text-center text-xl font-bold rounded-xl border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                disabled={isLoading}
                            />
                        ))}
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={isLoading || otp.some(d => !d)}
                    className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-base rounded-xl shadow-lg shadow-blue-500/20"
                >
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>

                <div className="text-center pt-2">
                    <button
                        type="button"
                        onClick={handleResendClick}
                        disabled={!canResend || isResending}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-slate-400 flex items-center justify-center gap-2 mx-auto"
                    >
                        {isResending ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {canResend ? 'Resend code' : `Resend code in ${timer}s`}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};
