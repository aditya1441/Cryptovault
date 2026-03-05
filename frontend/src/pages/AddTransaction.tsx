import React, { useState } from 'react';
import { api } from '../lib/api';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Coins, DollarSign, Hash, Calendar } from 'lucide-react';
import { PageWrapper } from '../components/PageWrapper';
import toast from 'react-hot-toast';

const COMMON_COINS = [
    { name: 'Bitcoin', symbol: 'btcusd' },
    { name: 'Ethereum', symbol: 'ethusd' },
    { name: 'Solana', symbol: 'solusd' },
    { name: 'BNB', symbol: 'bnbusd' },
    { name: 'Avalanche', symbol: 'avaxusd' },
    { name: 'Chainlink', symbol: 'linkusd' },
];

export const AddTransaction: React.FC = () => {
    const [symbol, setSymbol] = useState('');
    const [coinName, setCoinName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [type, setType] = useState<'buy' | 'sell'>('buy');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const quickSelect = (name: string, sym: string) => {
        setCoinName(name);
        setSymbol(sym);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await api.post('/transactions', {
                symbol: symbol.toLowerCase().trim(),
                coin_name: coinName,
                quantity: parseFloat(quantity),
                purchase_price: parseFloat(price),
                trade_date: date,
                type: type,
            });
            toast.success(`${coinName} trade added successfully!`);
            navigate('/dashboard');
        } catch (err: any) {
            const detail = err.response?.data?.detail;
            const msg = Array.isArray(detail) ? detail[0].msg : (detail || 'Failed to add transaction');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageWrapper>
            <div className="max-w-6xl mx-auto px-6 py-10">
                <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8">
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>

                <div className="grid lg:grid-cols-[1fr_340px] gap-6">
                    {/* Main form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="card"
                    >
                        <h1 className="text-2xl font-bold text-white mb-1">Log a Trade</h1>
                        <p className="text-white/40 text-sm mb-8">Record a new cryptocurrency purchase in your portfolio</p>

                        {error && (
                            <div className="bg-danger/10 text-danger text-sm rounded-xl px-4 py-3 mb-6 border border-danger/20">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Buy / Sell Toggle */}
                            <div className="flex bg-white/5 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setType('buy')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'buy' ? 'bg-success text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    Buy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setType('sell')}
                                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${type === 'sell' ? 'bg-danger text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                >
                                    Sell
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-white/50 mb-2 font-medium">Coin Name</label>
                                    <div className="relative">
                                        <Coins size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="text"
                                            placeholder="e.g. Bitcoin"
                                            value={coinName}
                                            onChange={e => setCoinName(e.target.value)}
                                            className="input-field pl-11"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm text-white/50 mb-2 font-medium">Ticker Symbol</label>
                                    <div className="relative">
                                        <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="text"
                                            placeholder="e.g. btcusd"
                                            value={symbol}
                                            onChange={e => setSymbol(e.target.value)}
                                            className="input-field pl-11"
                                            required
                                        />
                                    </div>
                                    <p className="text-white/25 text-xs mt-1.5">Use Gemini symbols (btcusd, ethusd)</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-white/50 mb-2 font-medium">Quantity</label>
                                    <input
                                        type="number"
                                        step="any"
                                        min="0"
                                        placeholder="0.00"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value)}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-white/50 mb-2 font-medium">Price per Coin (USD)</label>
                                    <div className="relative">
                                        <DollarSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input
                                            type="number"
                                            step="any"
                                            min="0"
                                            placeholder="0.00"
                                            value={price}
                                            onChange={e => setPrice(e.target.value)}
                                            className="input-field pl-11"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm text-white/50 mb-2 font-medium">Trade Date</label>
                                <div className="relative">
                                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                        className="input-field pl-11"
                                        required
                                    />
                                </div>
                            </div>

                            {quantity && price && (
                                <div className="bg-white/[0.03] rounded-xl px-4 py-3.5 border border-white/[0.06] flex items-center justify-between">
                                    <span className="text-white/50 text-sm">Total {type === 'buy' ? 'Cost' : 'Value'}</span>
                                    <span className="text-white font-semibold">
                                        ${(parseFloat(quantity) * parseFloat(price)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            )}

                            <button type="submit" disabled={loading} className="btn-primary w-full py-3.5 text-base mt-2">
                                {loading
                                    ? <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    : 'Add to Portfolio'
                                }
                            </button>
                        </form>
                    </motion.div>

                    {/* Quick-select panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="card h-fit"
                    >
                        <h3 className="text-base font-semibold text-white mb-4">Quick Select</h3>
                        <div className="space-y-2">
                            {COMMON_COINS.map(c => (
                                <button
                                    key={c.symbol}
                                    type="button"
                                    onClick={() => quickSelect(c.name, c.symbol)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${symbol === c.symbol
                                        ? 'bg-accent/15 border border-accent/30 text-white'
                                        : 'bg-white/[0.03] border border-white/[0.06] text-white/60 hover:bg-white/[0.06] hover:text-white'
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold">
                                        {c.symbol.replace('usd', '').toUpperCase().slice(0, 3)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{c.name}</p>
                                        <p className="text-xs opacity-50">{c.symbol}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </PageWrapper>
    );
};
