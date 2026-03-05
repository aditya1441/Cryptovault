import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, List, Plus, LogOut, Zap, Globe, Brain, Bell, Menu, X, User as UserIcon } from 'lucide-react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';

const BACKEND_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '');

export const Navbar: React.FC = () => {
    const { user, logout, refreshUser } = useAuth();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll);
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Close mobile menu on route change
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post('/auth/profile-picture', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            await refreshUser();
            toast.success("Profile picture updated!");
        } catch {
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    };

    if (!user) return null;

    const navLinks = [
        { to: '/dashboard', icon: <LayoutDashboard size={15} />, label: 'Dashboard' },
        { to: '/transactions', icon: <List size={15} />, label: 'Trades' },
        { to: '/market', icon: <Globe size={15} />, label: 'Market' },
        { to: '/insights', icon: <Brain size={15} />, label: 'Insights' },
        { to: '/alerts', icon: <Bell size={15} />, label: 'Alerts' },
    ];

    const NavLink = ({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) => {
        const active = location.pathname === to;
        return (
            <Link
                to={to}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${active ? 'text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                    }`}
            >
                {active && (
                    <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-xl bg-white/10"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                    />
                )}
                <span className="relative z-10 flex items-center gap-2">
                    {icon}
                    <span className="hidden lg:inline">{label}</span>
                </span>
            </Link>
        );
    };

    return (
        <>
            <header
                className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-black/80 backdrop-blur-2xl border-b border-white/[0.06]' : 'bg-transparent'
                    }`}
            >
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
                        <motion.div
                            whileHover={{ rotate: -10, scale: 1.1 }}
                            className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center"
                        >
                            <Zap size={16} className="text-white" fill="white" />
                        </motion.div>
                        <span className="font-bold text-white text-lg tracking-tight">CryptoVault</span>
                    </Link>

                    {/* Desktop nav */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map(l => <NavLink key={l.to} {...l} />)}
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="ml-1">
                            <Link
                                to="/transactions/new"
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent/90 transition-all"
                            >
                                <Plus size={15} />
                                <span className="hidden xl:inline">Add Trade</span>
                            </Link>
                        </motion.div>
                    </nav>

                    {/* Right — user + mobile toggle */}
                    <div className="flex items-center gap-3">
                        <span className="hidden md:block text-sm text-white/40 truncate max-w-[140px]">{user.email}</span>

                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-9 h-9 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex flex-shrink-0 group items-center justify-center transition-all hover:border-white/20"
                            title="Update Profile Picture"
                        >
                            {user.profile_picture_url ? (
                                <img
                                    src={`${BACKEND_URL}${user.profile_picture_url}`}
                                    alt="Profile"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <UserIcon size={14} className="text-white/50 group-hover:text-white transition-colors" />
                            )}
                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                </div>
                            )}
                        </button>

                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={logout}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                            title="Log out"
                        >
                            <LogOut size={15} />
                        </motion.button>
                        {/* Mobile hamburger */}
                        <button
                            onClick={() => setMobileOpen(v => !v)}
                            className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white transition-all"
                        >
                            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="md:hidden fixed top-16 left-0 right-0 z-40 bg-black/95 backdrop-blur-2xl border-b border-white/[0.06] px-6 py-4 space-y-1"
                    >
                        {navLinks.map(l => (
                            <Link
                                key={l.to}
                                to={l.to}
                                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${location.pathname === l.to
                                    ? 'bg-white/10 text-white'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {l.icon}
                                {l.label}
                            </Link>
                        ))}
                        <Link
                            to="/transactions/new"
                            className="flex items-center gap-2 px-4 py-3.5 rounded-xl text-sm font-semibold bg-accent text-white mt-2"
                        >
                            <Plus size={15} /> Add Trade
                        </Link>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
