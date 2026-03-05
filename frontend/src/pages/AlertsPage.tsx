import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Plus, Trash2, TrendingUp, TrendingDown, CheckCircle, X } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { PageWrapper } from '../components/PageWrapper';
import toast from 'react-hot-toast';
import { api } from '../lib/api';

interface Alert {
    id: number;
    coin_name: string;
    symbol: string;
    target_price: number;
    direction: 'above' | 'below';
    triggered: boolean;
    created_at: string;
}

const COIN_OPTIONS = [
    { name: 'Bitcoin', symbol: 'btcusd', ticker: 'BTC' },
    { name: 'Ethereum', symbol: 'ethusd', ticker: 'ETH' },
    { name: 'Solana', symbol: 'solusd', ticker: 'SOL' },
    { name: 'BNB', symbol: 'bnbusd', ticker: 'BNB' },
    { name: 'Avalanche', symbol: 'avaxusd', ticker: 'AVAX' },
    { name: 'Chainlink', symbol: 'linkusd', ticker: 'LINK' },
];

export const AlertsPage: React.FC = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [coin, setCoin] = useState(COIN_OPTIONS[0]);
    const [direction, setDirection] = useState<'above' | 'below'>('above');
    const [price, setPrice] = useState('');
    const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});

    const fetchAlerts = async () => {
        try {
            const { data } = await api.get('/alerts');
            setAlerts(data);
        } catch (e) {
            console.error('Failed to load alerts', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    // Fetch live prices for quick display reference (not for triggering, backend handles that)
    useEffect(() => {
        const symbols = [...new Set([...alerts.map(a => a.symbol), ...COIN_OPTIONS.map(c => c.symbol)])];
        symbols.forEach(async (sym) => {
            try {
                const res = await fetch(`https://api.gemini.com/v1/pubticker/${sym}`);
                if (!res.ok) return;
                const data = await res.json();
                setCurrentPrices(prev => ({ ...prev, [sym]: parseFloat(data.last || '0') }));
            } catch { /* ignore */ }
        });
    }, [alerts.length]);

    const addAlert = async (e: React.FormEvent) => {
        e.preventDefault();
        const target_price = parseFloat(price);
        if (!target_price || target_price <= 0) return;
        setFormLoading(true);
        try {
            const { data } = await api.post('/alerts', {
                coin_name: coin.name,
                symbol: coin.symbol,
                target_price,
                direction,
            });
            setAlerts([data, ...alerts]);
            setPrice('');
            setShowForm(false);
            toast.success(`Alert set for ${coin.name} at ${formatCurrency(target_price)}`);
        } catch {
            toast.error('Failed to create alert');
        } finally {
            setFormLoading(false);
        }
    };

    const deleteAlert = async (id: number) => {
        try {
            await api.delete(`/alerts/${id}`);
            setAlerts(alerts.filter(a => a.id !== id));
            toast('Alert removed', { icon: '🗑️' });
        } catch {
            toast.error('Failed to delete alert');
        }
    };

    const activeAlerts = alerts.filter(a => !a.triggered);
    const triggeredAlerts = alerts.filter(a => a.triggered);

    return (
        <PageWrapper>
            <div className="max-w-4xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Bell size={28} className="text-warning" />
                            Price Alerts
                        </h1>
                        <p className="text-white/40 text-sm mt-1">
                            {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setShowForm(v => !v)}
                        className="btn-primary text-sm py-2.5 px-5"
                    >
                        <Plus size={15} />
                        New Alert
                    </motion.button>
                </div>

                {/* Add Alert Form */}
                <AnimatePresence>
                    {showForm && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                        >
                            <form onSubmit={addAlert} className="card border-accent/20 bg-accent/[0.03]">
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="font-semibold text-white">Create Price Alert</h3>
                                    <button type="button" onClick={() => setShowForm(false)} className="text-white/30 hover:text-white transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="grid sm:grid-cols-3 gap-4">
                                    {/* Coin select */}
                                    <div>
                                        <label className="block text-xs text-white/50 mb-2 font-medium">Coin</label>
                                        <select
                                            value={coin.symbol}
                                            onChange={e => setCoin(COIN_OPTIONS.find(c => c.symbol === e.target.value) || COIN_OPTIONS[0])}
                                            className="input-field"
                                        >
                                            {COIN_OPTIONS.map(c => (
                                                <option key={c.symbol} value={c.symbol}>{c.name} ({c.ticker})</option>
                                            ))}
                                        </select>
                                        {currentPrices[coin.symbol] && (
                                            <p className="text-white/30 text-xs mt-1.5">
                                                Current: {formatCurrency(currentPrices[coin.symbol])}
                                            </p>
                                        )}
                                    </div>

                                    {/* Direction */}
                                    <div>
                                        <label className="block text-xs text-white/50 mb-2 font-medium">Alert when price is</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['above', 'below'] as const).map(d => (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => setDirection(d)}
                                                    className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold border transition-all ${direction === d
                                                        ? d === 'above'
                                                            ? 'bg-success/15 border-success/40 text-success'
                                                            : 'bg-danger/15 border-danger/40 text-danger'
                                                        : 'bg-white/[0.03] border-white/10 text-white/40 hover:text-white'
                                                        }`}
                                                >
                                                    {d === 'above' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                                    {d.charAt(0).toUpperCase() + d.slice(1)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Target price */}
                                    <div>
                                        <label className="block text-xs text-white/50 mb-2 font-medium">Target Price (USD)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            placeholder="e.g. 80000"
                                            value={price}
                                            onChange={e => setPrice(e.target.value)}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" disabled={formLoading} className="btn-primary mt-4 py-3 px-6">
                                    {formLoading ? <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Bell size={15} />}
                                    Create Alert
                                </button>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Active Alerts */}
                {loading ? (
                    <div className="flex justify-center py-20">
                        <span className="w-8 h-8 rounded-full border-2 border-white/20 border-t-accent animate-spin" />
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="card flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mb-4">
                            <Bell size={24} className="text-warning" />
                        </div>
                        <p className="text-white font-semibold mb-2">No alerts yet</p>
                        <p className="text-white/40 text-sm mb-5">Set your first price alert to get notified when a coin hits your target</p>
                        <button onClick={() => setShowForm(true)} className="btn-primary text-sm py-2.5 px-5">
                            <Plus size={14} /> Set Alert
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {[...activeAlerts, ...triggeredAlerts].map((alert, i) => (
                                <motion.div
                                    key={alert.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20, height: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className={`card flex items-center gap-4 ${alert.triggered ? 'opacity-50' : ''}`}
                                >
                                    {/* Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.triggered
                                        ? 'bg-success/15 text-success'
                                        : alert.direction === 'above'
                                            ? 'bg-success/10 text-success'
                                            : 'bg-danger/10 text-danger'
                                        }`}>
                                        {alert.triggered
                                            ? <CheckCircle size={18} />
                                            : alert.direction === 'above'
                                                ? <TrendingUp size={18} />
                                                : <TrendingDown size={18} />
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-semibold text-sm">{alert.coin_name}</p>
                                        <p className="text-white/40 text-xs mt-0.5">
                                            Alert when {alert.direction} {formatCurrency(alert.target_price)}
                                            {currentPrices[alert.symbol] && (
                                                <span className="ml-2 text-white/25">
                                                    · Current: {formatCurrency(currentPrices[alert.symbol])}
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Status badge */}
                                    <span className={`badge text-xs flex-shrink-0 ${alert.triggered ? 'badge-success' : 'badge-info'}`}>
                                        {alert.triggered ? '✓ Triggered' : '● Active'}
                                    </span>

                                    {/* Delete */}
                                    <button
                                        onClick={() => deleteAlert(alert.id)}
                                        className="w-8 h-8 rounded-lg text-white/20 hover:text-danger hover:bg-danger/10 transition-all flex items-center justify-center flex-shrink-0"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </PageWrapper>
    );
};
