import { useState } from 'react';
import { Button } from './ui/button';
import { auth, googleProvider } from '../config/firebase';
import { signInWithPopup } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const GoogleLoginButton = () => {
    const [isLoading, setIsLoading] = useState(false);
    const { loginWithGoogle } = useAuth(); // We need to implement this in useAuth or just call API directly if useAuth doesn't support it yet
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();

            // Send token to backend
            await loginWithGoogle(idToken);

            toast.success('Successfully logged in with Google');
            navigate('/');
        } catch (error: any) {
            console.error('Google login error:', error);
            toast.error(error.message || 'Failed to login with Google');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            variant="outline"
            type="button"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleLogin}
            disabled={isLoading}
        >
            {isLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
                <svg className="h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                    <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                </svg>
            )}
            Sign in with Google
        </Button>
    );
};
