import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Shield, Zap, BarChart2, Globe, Brain, Bell } from 'lucide-react';

const TICKER_ITEMS = [
    { symbol: 'BTC', price: '$64,230', change: '+2.4%', pos: true },
    { symbol: 'ETH', price: '$3,190', change: '+1.8%', pos: true },
    { symbol: 'SOL', price: '$142', change: '-0.5%', pos: false },
    { symbol: 'BNB', price: '$598', change: '+3.1%', pos: true },
    { symbol: 'AVAX', price: '$38', change: '-1.2%', pos: false },
    { symbol: 'MATIC', price: '$0.92', change: '+0.7%', pos: true },
    { symbol: 'DOT', price: '$8.20', change: '+2.1%', pos: true },
    { symbol: 'LINK', price: '$17.40', change: '-0.3%', pos: false },
];

const features = [
    {
        icon: <TrendingUp size={20} className="text-brand-light" />,
        title: 'Real-Time WebSockets',
        desc: 'Experience zero-latency live pricing directly from exchange WebSockets.',
        glow: 'rgba(59,158,255,0.15)',
    },
    {
        icon: <BarChart2 size={20} className="text-success" />,
        title: 'Paper Trading Engine',
        desc: 'Practice trading with $100k virtual balance risk-free before using real funds.',
        glow: 'rgba(50,215,75,0.15)',
    },
    {
        icon: <Brain size={20} className="text-purple-400" />,
        title: 'AI Portfolio Insights',
        desc: 'Get personalized portfolio analysis, risk scoring, and sentiment insights from OpenAI.',
        glow: 'rgba(191,90,242,0.15)',
    },
    {
        icon: <Bell size={20} className="text-warning" />,
        title: '24/7 Background Alerts',
        desc: 'Set custom price triggers. Our background engine will SMS you when they hit.',
        glow: 'rgba(255,214,10,0.15)',
    },
    {
        icon: <Shield size={20} className="text-danger" />,
        title: 'Automated Tax Reports',
        desc: 'Instantly download CSV reports with realized PnL calculated via FIFO logic.',
        glow: 'rgba(255,69,58,0.15)',
    },
    {
        icon: <Globe size={20} className="text-brand-light" />,
        title: 'Custom User Profiles',
        desc: 'Personalize your CryptoVault experience with custom profile images and settings.',
        glow: 'rgba(59,158,255,0.15)',
    },
];

const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.1 } }),
};

export const LandingPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-black overflow-hidden">
            {/* Ticker bar */}
            <div className="border-b border-white/[0.06] bg-surface overflow-hidden py-2.5">
                <div className="flex animate-[ticker_30s_linear_infinite] w-max gap-8">
                    {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => (
                        <span key={i} className="flex items-center gap-2 whitespace-nowrap text-sm">
                            <span className="font-semibold text-white">{t.symbol}</span>
                            <span className="text-white/50">{t.price}</span>
                            <span className={t.pos ? 'text-success' : 'text-danger'}>{t.change}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Navbar */}
            <header className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <motion.div
                        whileHover={{ rotate: -15, scale: 1.1 }}
                        className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center"
                    >
                        <Zap size={16} className="text-white" fill="white" />
                    </motion.div>
                    <span className="font-bold text-white text-lg">CryptoVault</span>
                </div>
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                    <Link to="/auth" className="btn-primary text-sm px-5 py-2.5">
                        Get Started <ArrowRight size={15} />
                    </Link>
                </motion.div>
            </header>

            {/* Hero */}
            <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-32 text-center">
                {/* Background glows */}
                <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl pointer-events-none" />
                <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-purple-500/5 blur-3xl pointer-events-none" />
                <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-success/5 blur-3xl pointer-events-none" />

                <motion.div initial="hidden" animate="visible" className="relative z-10">
                    <motion.div custom={0} variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent/30 bg-accent/10 text-accent text-sm font-medium mb-8">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        Live portfolio tracking · AI insights · Price alerts
                    </motion.div>

                    <motion.h1 custom={1} variants={fadeUp} className="text-5xl sm:text-7xl font-bold leading-tight tracking-tight mb-6">
                        <span className="text-gradient">Your Crypto.</span>
                        <br />
                        <span className="text-gradient-blue">Fully in Control.</span>
                    </motion.h1>

                    <motion.p custom={2} variants={fadeUp} className="text-white/50 text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        Track your cryptocurrency portfolio with real-time prices from Gemini exchange.
                        Calculate PnL, set price alerts, and get AI-powered insights.
                    </motion.p>

                    <motion.div custom={3} variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                            <Link to="/auth" className="btn-primary text-base px-8 py-4 glow-blue">
                                Start Tracking Free <ArrowRight size={18} />
                            </Link>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                            <Link to="/auth?mode=login" className="btn-secondary text-base px-8 py-4">
                                Sign In
                            </Link>
                        </motion.div>
                    </motion.div>
                </motion.div>

                {/* Mock dashboard card */}
                <motion.div
                    initial={{ opacity: 0, y: 60, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    className="relative mt-20 mx-auto max-w-3xl"
                >
                    <div className="glass p-6 rounded-3xl">
                        <div className="flex items-center justify-between mb-6">
                            <div className="text-left">
                                <p className="text-white/40 text-sm mb-1">Total Portfolio Value</p>
                                <h2 className="text-4xl font-bold text-white">$48,320.50</h2>
                                <p className="text-success text-sm font-medium mt-1 flex items-center gap-1">
                                    <TrendingUp size={14} /> +$3,210.40 (+7.12%) this month
                                </p>
                            </div>
                            <div className="text-right hidden sm:block">
                                <p className="text-white/40 text-sm mb-1">Total Invested</p>
                                <p className="text-xl font-semibold text-white">$45,110.10</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { sym: 'BTC', val: '$28,450', pct: '+8.2%', pos: true, color: '#f7931a' },
                                { sym: 'ETH', val: '$12,380', pct: '+5.4%', pos: true, color: '#627eea' },
                                { sym: 'SOL', val: '$7,490', pct: '-2.1%', pos: false, color: '#9945ff' },
                            ].map((item) => (
                                <motion.div
                                    key={item.sym}
                                    whileHover={{ y: -2 }}
                                    className="rounded-xl p-4 text-left"
                                    style={{ background: `${item.color}15`, border: `1px solid ${item.color}30` }}
                                >
                                    <p className="text-white/40 text-xs mb-1">{item.sym}</p>
                                    <p className="text-white font-semibold">{item.val}</p>
                                    <p className={`text-xs font-medium mt-0.5 ${item.pos ? 'text-success' : 'text-danger'}`}>{item.pct}</p>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                    {/* Glow under card */}
                    <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-accent/20 blur-3xl rounded-full" />
                </motion.div>
            </section>

            {/* Features */}
            <section className="max-w-6xl mx-auto px-6 pb-24">
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-3xl font-bold text-center text-gradient mb-3"
                >
                    Everything you need to track your portfolio
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="text-white/40 text-center mb-12"
                >
                    Now with AI insights, price alerts, and live market explorer
                </motion.p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.08 }}
                            whileHover={{ y: -4, transition: { duration: 0.2 } }}
                            className="card card-hover"
                            style={{ '--glow': f.glow } as React.CSSProperties}
                        >
                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4">
                                {f.icon}
                            </div>
                            <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                            <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="max-w-6xl mx-auto px-6 pb-24">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="glass rounded-3xl p-12 text-center relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-hero-glow opacity-50 pointer-events-none" />
                    <div className="relative z-10">
                        <h2 className="text-3xl font-bold text-white mb-4">Ready to take control?</h2>
                        <p className="text-white/40 mb-8 max-w-md mx-auto">
                            Join thousands of traders tracking their crypto with CryptoVault.
                        </p>
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                            <Link to="/auth" className="btn-primary text-base px-8 py-4 glow-blue">
                                Get Started Free <ArrowRight size={18} />
                            </Link>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="border-t border-white/[0.06] py-8 text-center text-sm text-white/30">
                © 2026 CryptoVault · Built with FastAPI & React ·{' '}
                <span className="text-accent">All systems operational</span>
            </footer>
        </div>
    );
};
