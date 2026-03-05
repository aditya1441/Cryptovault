import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, TrendingUp, TrendingDown, DollarSign, BarChart2, RefreshCw, AlertTriangle, Sparkles, Brain, Wallet, FileText } from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber } from '../lib/utils';
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { SkeletonCard, SkeletonTable } from '../components/SkeletonCard';
import { PageWrapper } from '../components/PageWrapper';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Holding {
    symbol: string;
    coin_name: string;
    quantity: string;
    avg_buy_price: string;
    total_invested: string;
    current_price: string;
    current_value: string;
    pnl: string;
    pnl_pct: string;
    price_cached: boolean;
}

interface Portfolio {
    total_invested: string;
    total_current_value: string;
    total_pnl: string;
    total_pnl_pct: string;
    holdings: Holding[];
}

const StatCard: React.FC<{
    label: string;
    value: number;
    prefix?: string;
    suffix?: string;
    sub?: string;
    positive?: boolean;
    icon: React.ReactNode;
    delay?: number;
    decimals?: number;
}> = ({ label, value, prefix = '$', suffix = '', sub, positive, icon, delay = 0, decimals = 2 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.45 }}
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className="card card-hover"
    >
        <div className="flex items-start justify-between mb-4">
            <p className="text-white/40 text-sm font-medium">{label}</p>
            <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                {icon}
            </div>
        </div>
        <p className="text-2xl font-bold text-white mb-1">
            <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
        </p>
        {sub && (
            <p className={`text-sm font-medium ${positive === true ? 'text-success' : positive === false ? 'text-danger' : 'text-white/40'}`}>
                {sub}
            </p>
        )}
    </motion.div>
);

const generateChartData = (baseValue: number) => {
    const data = [];
    let val = baseValue * 0.8;
    for (let i = 30; i >= 0; i--) {
        val = val * (1 + (Math.random() - 0.45) * 0.04);
        data.push({ day: `${i}d`, value: Math.max(val, baseValue * 0.5) });
    }
    data[data.length - 1].value = baseValue;
    return data;
};

const COIN_COLORS: Record<string, string> = {
    btcusd: '#f7931a', ethusd: '#627eea', solusd: '#9945ff',
    bnbusd: '#f0b90b', avaxusd: '#e84142', linkusd: '#2a5ada',
    maticusd: '#8247e5', dotusd: '#e6007a', ltcusd: '#bfbbbb', dogeusd: '#c2a633',
};

export const Dashboard: React.FC = () => {
    const { user } = useAuth();
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [timeRange] = useState('30D');

    const downloadTaxReport = async () => {
        setDownloading(true);
        try {
            const response = await api.get('/reports/tax-csv', {
                responseType: 'blob',
            });
            // Create a temporary link to trigger browser download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'cryptovault_tax_report.csv');
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Tax report downloaded!');
        } catch (err) {
            toast.error('Failed to download report');
            console.error(err);
        } finally {
            setDownloading(false);
        }
    };

    const fetchPortfolio = async (quiet = false) => {
        if (!quiet) setLoading(true);
        else setRefreshing(true);
        try {
            const { data } = await api.get('/portfolio');
            setPortfolio(data);
            if (quiet) toast.success('Portfolio refreshed!', { duration: 2000 });
        } catch (err) {
            console.error(err);
            if (quiet) toast.error('Failed to refresh prices');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchPortfolio(); }, []);

    if (loading) {
        return (
            <PageWrapper>
                <div className="max-w-6xl mx-auto px-6 py-10">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <div className="h-8 w-32 bg-white/[0.06] rounded-xl mb-2 animate-pulse" />
                            <div className="h-4 w-48 bg-white/[0.04] rounded-lg animate-pulse" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                    <SkeletonTable rows={4} />
                </div>
            </PageWrapper>
        );
    }

    const totalValue = parseFloat(portfolio?.total_current_value || '0');
    const totalPnl = parseFloat(portfolio?.total_pnl || '0');
    const totalPnlPct = parseFloat(portfolio?.total_pnl_pct || '0');
    const totalInvested = parseFloat(portfolio?.total_invested || '0');
    const isPositive = totalPnl >= 0;
    const chartData = generateChartData(totalValue || 1000);

    return (
        <PageWrapper>
            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Portfolio</h1>
                        <p className="text-white/40 text-sm mt-1">Track your crypto holdings in real time</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <motion.button
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => fetchPortfolio(true)}
                            disabled={refreshing}
                            className="btn-secondary text-sm py-2 px-4"
                        >
                            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </motion.button>
                        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                            <Link to="/transactions/new" className="btn-primary text-sm py-2 px-4">
                                <Plus size={15} /> Add Trade
                            </Link>
                        </motion.div>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Total Value"
                        value={totalValue}
                        icon={<DollarSign size={18} />}
                        delay={0}
                    />
                    <StatCard
                        label="Total Invested"
                        value={totalInvested}
                        icon={<BarChart2 size={18} />}
                        delay={0.08}
                    />
                    <StatCard
                        label="Total P&L"
                        value={Math.abs(totalPnl)}
                        prefix={totalPnl >= 0 ? '+$' : '-$'}
                        sub={`${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}% all time`}
                        positive={isPositive}
                        icon={isPositive ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                        delay={0.16}
                    />
                    <StatCard
                        label="Paper Balance"
                        value={user?.virtual_balance || 0}
                        icon={<Wallet size={18} className="text-brand-light" />}
                        delay={0.24}
                    />
                </div>

                {/* Quick action cards */}
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                    <Link to="/insights">
                        <motion.div
                            whileHover={{ y: -2, borderColor: 'rgba(10,132,255,0.3)' }}
                            className="card flex items-center gap-4 cursor-pointer border-white/[0.06] hover:bg-accent/[0.04] transition-colors"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                                <Brain size={22} className="text-accent" />
                            </div>
                            <div>
                                <p className="font-semibold text-white text-sm">AI Portfolio Insights</p>
                                <p className="text-white/40 text-xs mt-0.5">Smart analysis · risk score · tips</p>
                            </div>
                        </motion.div>
                    </Link>
                    <Link to="/market">
                        <motion.div
                            whileHover={{ y: -2, borderColor: 'rgba(50,215,75,0.3)' }}
                            className="card flex items-center gap-4 cursor-pointer border-white/[0.06] hover:bg-success/[0.03] transition-colors"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center flex-shrink-0">
                                <Sparkles size={22} className="text-success" />
                            </div>
                            <div>
                                <p className="font-semibold text-white text-sm">Market Explorer</p>
                                <p className="text-white/40 text-xs mt-0.5">Live prices for 10+ coins</p>
                            </div>
                        </motion.div>
                    </Link>
                    <motion.div
                        whileHover={{ y: -2, borderColor: 'rgba(251,59,48,0.3)' }}
                        onClick={downloadTaxReport}
                        className="card flex items-center gap-4 cursor-pointer border-white/[0.06] hover:bg-danger/[0.03] transition-colors"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-danger/10 flex items-center justify-center flex-shrink-0">
                            {downloading
                                ? <RefreshCw size={22} className="text-danger animate-spin" />
                                : <FileText size={22} className="text-danger" />
                            }
                        </div>
                        <div>
                            <p className="font-semibold text-white text-sm">
                                {downloading ? 'Generating...' : 'Download Tax Report'}
                            </p>
                            <p className="text-white/40 text-xs mt-0.5">FIFO realized PnL CSV</p>
                        </div>
                    </motion.div>
                </div>

                {/* Portfolio chart */}
                {totalValue > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="card mb-8"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <p className="text-white/40 text-sm mb-1">Portfolio Value — {timeRange}</p>
                                <h2 className="text-3xl font-bold text-white">
                                    <AnimatedNumber value={totalValue} />
                                </h2>
                                <span className={`text-sm font-semibold mt-1 inline-flex items-center gap-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                                    {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                    {formatPercent(totalPnlPct)} · {formatCurrency(Math.abs(totalPnl))}
                                </span>
                            </div>
                        </div>
                        <ResponsiveContainer width="100%" height={180}>
                            <AreaChart data={chartData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isPositive ? '#32d74b' : '#ff453a'} stopOpacity={0.25} />
                                        <stop offset="95%" stopColor={isPositive ? '#32d74b' : '#ff453a'} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    contentStyle={{ background: '#1c1c1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: '#fff', fontSize: 13 }}
                                    formatter={(v: number | undefined) => [v !== undefined ? formatCurrency(v) : '', 'Value']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={isPositive ? '#32d74b' : '#ff453a'}
                                    strokeWidth={2}
                                    fill="url(#valueGrad)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </motion.div>
                )}

                {/* Holdings table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="card p-0 overflow-hidden"
                >
                    <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
                        <h2 className="font-semibold text-white">Your Holdings</h2>
                        {portfolio?.holdings.some(h => h.price_cached) && (
                            <span className="flex items-center gap-1.5 text-warning text-xs font-medium">
                                <AlertTriangle size={13} /> Using cached prices
                            </span>
                        )}
                    </div>

                    {portfolio?.holdings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                <BarChart2 size={24} className="text-white/30" />
                            </div>
                            <p className="text-white/40 text-sm mb-4">No holdings yet. Log your first trade.</p>
                            <Link to="/transactions/new" className="btn-primary text-sm py-2 px-5">
                                <Plus size={15} /> Add Trade
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/[0.06]">
                                        {['Asset', 'Price', 'Holdings', 'Value', 'P&L'].map(h => (
                                            <th key={h} className="px-6 py-3.5 text-left text-xs font-medium text-white/30 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {portfolio?.holdings.map((h, i) => {
                                            const pnlPos = parseFloat(h.pnl) >= 0;
                                            const initials = h.symbol.replace('usd', '').toUpperCase().slice(0, 3);
                                            const coinColor = COIN_COLORS[h.symbol] || '#0A84FF';
                                            return (
                                                <motion.tr
                                                    key={h.symbol}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    transition={{ delay: 0.05 * i }}
                                                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                                                    className="border-b border-white/[0.04] transition-colors"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold"
                                                                style={{ background: `${coinColor}25`, border: `1px solid ${coinColor}40`, color: coinColor }}
                                                            >
                                                                {initials}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-white text-sm">{h.coin_name}</p>
                                                                <p className="text-white/30 text-xs uppercase">{h.symbol}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-white text-sm font-medium">{formatCurrency(parseFloat(h.current_price))}</p>
                                                        <p className="text-white/30 text-xs mt-0.5">avg {formatCurrency(parseFloat(h.avg_buy_price))}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-white text-sm">{formatNumber(h.quantity, 6)}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-white text-sm font-semibold">{formatCurrency(parseFloat(h.current_value))}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`badge text-xs ${pnlPos ? 'badge-success' : 'badge-danger'}`}>
                                                            {pnlPos ? '▲' : '▼'} {formatCurrency(Math.abs(parseFloat(h.pnl)))}
                                                        </span>
                                                        <p className={`text-xs mt-1 ${pnlPos ? 'text-success' : 'text-danger'}`}>
                                                            {pnlPos ? '+' : ''}{h.pnl_pct}%
                                                        </p>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            </div>
        </PageWrapper>
    );
};
