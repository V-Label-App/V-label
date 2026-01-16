import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Checkbox } from '../../../components/ui/checkbox';
import { Shield, Users, CheckCircle, Pencil, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginProps {
  onLogin: (role: 'admin' | 'manager' | 'annotator' | 'reviewer') => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock role assignment based on email
    if (email.includes('admin')) {
      onLogin('admin');
    } else if (email.includes('manager')) {
      onLogin('manager');
    } else if (email.includes('reviewer')) {
      onLogin('reviewer');
    } else {
      onLogin('annotator');
    }
  };

  const handleGoogleLogin = () => {
    onLogin('annotator');
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
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-bold text-xl">V</span>
            </div>
            <h1 className="text-2xl font-semibold text-white">VLabel Portal</h1>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col justify-center px-12 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            <h2 className="text-4xl font-semibold text-white mb-8">Welcome back!</h2>

            <div className="mb-12">
              <p className="text-slate-300 text-lg mb-4">Manage your:</p>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <span>Annotation Projects</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <span>Task Assignments</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <span>Quality Reviews</span>
                </li>
                <li className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <span>Team Collaborators</span>
                </li>
              </ul>
            </div>

            {/* Stats Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="text-white font-semibold">Your Stats</h3>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Annotations</p>
                  <p className="text-white text-3xl font-semibold">1.2k</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Accuracy</p>
                  <p className="text-emerald-400 text-3xl font-semibold">98%</p>
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
          </motion.div>

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            onSubmit={handleLogin}
            className="space-y-5"
          >
            {/* Email Input */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email or Username</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
                  className="h-12 bg-white border-slate-300 focus:border-blue-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium text-base"
            >
              Sign in
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
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 border-slate-300 hover:bg-slate-50 font-medium"
              onClick={handleGoogleLogin}
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign in with Google
            </Button>
          </motion.div>

          {/* Quick Login - Demo Mode */}
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
                  className="w-full h-auto py-3 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 border-blue-300"
                  onClick={() => onLogin('admin')}
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
                  className="w-full h-auto py-3 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 border-blue-300"
                  onClick={() => onLogin('manager')}
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
                  className="w-full h-auto py-3 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 border-blue-300"
                  onClick={() => onLogin('reviewer')}
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
                  className="w-full h-auto py-3 flex flex-col items-center gap-2 bg-white hover:bg-blue-50 border-blue-300"
                  onClick={() => onLogin('annotator')}
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
        </motion.div>
      </div>
    </div>
  );
}

export default Login;