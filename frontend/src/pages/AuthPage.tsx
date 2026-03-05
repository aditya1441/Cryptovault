import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Mail, Lock, Eye, EyeOff, ArrowRight, RefreshCw } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

type Mode = 'login' | 'signup' | 'verify';

export const AuthPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [mode, setMode] = useState<Mode>(searchParams.get('mode') === 'login' ? 'login' : 'signup');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const parseError = (err: any): string => {
        // Handle network errors (no response from server at all)
        if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') {
            return 'Cannot connect to server. Please check if the backend is running.';
        }
        // Handle errors thrown from AuthContext login
        if (err.message && !err.response) {
            return err.message;
        }
        const detail = err.response?.data?.detail;
        if (!detail) return 'An error occurred. Please try again.';
        if (typeof detail === 'string') return detail;
        if (Array.isArray(detail) && detail.length > 0) {
            // Pydantic validation errors have a 'msg' field
            const msg = detail[0].msg || detail[0].message || JSON.stringify(detail[0]);
            return msg.replace('Value error, ', '');
        }
        return 'An error occurred.';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            if (mode === 'verify') {
                const { data } = await api.post('/auth/verify-otp', { email, otp_code: otp });
                await login(data.access_token);
                navigate('/dashboard', { replace: true });
            } else if (mode === 'login') {
                const { data } = await api.post('/auth/login', { email, password });
                await login(data.access_token);
                navigate('/dashboard', { replace: true });
            } else {
                const { data } = await api.post('/auth/signup', { email, password });
                setMessage(data.message);
                setMode('verify');
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            const msg = parseError(err);
            setError(msg);
            if (msg.includes('verify your email')) setMode('verify');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/resend-otp', { email });
            setMessage(data.message);
        } catch (err: any) {
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse: any) => {
        setError('');
        setLoading(true);
        try {
            const { data } = await api.post('/auth/google', {
                credential: credentialResponse.credential,
            });
            await login(data.access_token);
            navigate('/dashboard', { replace: true });
        } catch (err: any) {
            console.error('Google auth error:', err);
            setError(parseError(err));
        } finally {
            setLoading(false);
        }
    };

    const titles: Record<Mode, string> = {
        login: 'Welcome back',
        signup: 'Create your account',
        verify: 'Check your inbox',
    };

    const subtitles: Record<Mode, string> = {
        login: 'Sign in to your CryptoVault',
        signup: 'Start tracking your crypto portfolio',
        verify: `We've sent a 6-digit code to ${email}`,
    };

    return (
        <div className="min-h-screen bg-black flex">
            {/* Left panel — branding */}
            <div className="hidden lg:flex flex-col justify-between w-2/5 bg-surface border-r border-white/[0.06] p-10 relative overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />

                <div className="relative z-10 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                        <Zap size={18} className="text-white" fill="white" />
                    </div>
                    <span className="font-bold text-white text-xl">CryptoVault</span>
                </div>

                <div className="relative z-10">
                    <div className="glass p-6 rounded-2xl mb-6 max-w-xs">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-white/40 text-xs mb-1">Total Balance</p>
                                <p className="text-2xl font-bold text-white">$48,320.50</p>
                            </div>
                            <div className="badge-success text-xs px-2 py-1">▲ 7.12%</div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {['BTC +8.2%', 'ETH +5.4%', 'SOL -2.1%'].map((t, i) => (
                                <div key={i} className="bg-white/5 rounded-lg p-2 text-xs text-white/60 text-center">{t}</div>
                            ))}
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-gradient mb-3 leading-tight">
                        Track every gain.<br />Miss nothing.
                    </h2>
                    <p className="text-white/40 text-sm leading-relaxed max-w-xs">
                        Real-time portfolio tracking powered by live Gemini exchange data.
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-6 text-sm text-white/30">
                    <span>🔒 OTP Verified</span>
                    <span>📈 Live Prices</span>
                    <span>🔑 JWT Auth</span>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-[400px]">
                    {/* Logo for mobile */}
                    <div className="flex lg:hidden items-center gap-2 mb-10">
                        <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
                            <Zap size={16} className="text-white" fill="white" />
                        </div>
                        <span className="font-bold text-white text-lg">CryptoVault</span>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25 }}
                        >
                            <h1 className="text-2xl font-bold text-white mb-1">{titles[mode]}</h1>
                            <p className="text-white/40 text-sm mb-8">{subtitles[mode]}</p>

                            {/* Status messages */}
                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-danger/10 text-danger text-sm rounded-xl px-4 py-3 mb-4 border border-danger/20"
                                    >
                                        {error}
                                    </motion.div>
                                )}
                                {message && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="bg-success/10 text-success text-sm rounded-xl px-4 py-3 mb-4 border border-success/20"
                                    >
                                        {message}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mode !== 'verify' ? (
                                    <>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                            <input
                                                type="email"
                                                placeholder="Email address"
                                                value={email}
                                                onChange={e => setEmail(e.target.value)}
                                                className="input-field pl-11"
                                                required
                                            />
                                        </div>
                                        <div className="relative">
                                            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                placeholder="Password"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="input-field pl-11 pr-11"
                                                required
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="text-center mb-2">
                                            <div className="grid grid-cols-6 gap-2">
                                                {[0, 1, 2, 3, 4, 5].map(i => (
                                                    <input
                                                        key={i}
                                                        id={`otp-${i}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        maxLength={1}
                                                        value={otp[i] || ''}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/\D/, '');
                                                            const arr = (otp + '      ').slice(0, 6).split('');
                                                            arr[i] = val;
                                                            const next = arr.join('').trimEnd();
                                                            setOtp(next.slice(0, 6));
                                                            if (val) {
                                                                const nextEl = document.getElementById(`otp-${i + 1}`);
                                                                if (nextEl) (nextEl as HTMLInputElement).focus();
                                                            }
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Backspace' && !otp[i] && i > 0) {
                                                                const prevEl = document.getElementById(`otp-${i - 1}`);
                                                                if (prevEl) (prevEl as HTMLInputElement).focus();
                                                            }
                                                        }}
                                                        className="input-field text-center text-xl font-bold p-0 h-14"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={loading}
                                            className="btn-ghost text-sm w-full justify-center"
                                        >
                                            <RefreshCw size={14} />
                                            Resend code
                                        </button>
                                    </>
                                )}

                                <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base glow-blue mt-2">
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {mode === 'verify' ? 'Verify & Sign In' : mode === 'login' ? 'Sign In' : 'Create Account'}
                                            <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Google Sign-In */}
                            {mode !== 'verify' && (
                                <>
                                    <div className="flex items-center gap-3 my-5">
                                        <div className="h-px flex-1 bg-white/[0.08]" />
                                        <span className="text-white/30 text-xs">or continue with</span>
                                        <div className="h-px flex-1 bg-white/[0.08]" />
                                    </div>
                                    <div className="flex justify-center">
                                        <GoogleLogin
                                            onSuccess={handleGoogleSuccess}
                                            onError={() => setError('Google Sign-In failed. Please try again.')}
                                            theme="filled_black"
                                            shape="rectangular"
                                            width="368"
                                            text={mode === 'login' ? 'signin_with' : 'signup_with'}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Switch mode */}
                            {mode !== 'verify' && (
                                <p className="text-center text-sm text-white/40 mt-6">
                                    {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                                    <button
                                        type="button"
                                        onClick={() => { setError(''); setMessage(''); setMode(mode === 'login' ? 'signup' : 'login'); }}
                                        className="text-accent font-semibold hover:underline"
                                    >
                                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                                    </button>
                                </p>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
