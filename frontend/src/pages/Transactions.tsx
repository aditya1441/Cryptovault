import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Calendar, TrendingUp } from 'lucide-react';
import { formatCurrency, formatNumber } from '../lib/utils';
import { PageWrapper } from '../components/PageWrapper';
import toast from 'react-hot-toast';

interface Transaction {
    id: number;
    symbol: string;
    coin_name: string;
    quantity: string;
    purchase_price: string;
    trade_date: string;
    type: string;
    created_at: string;
}

export const Transactions: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => { fetchTransactions(); }, []);

    const fetchTransactions = async () => {
        try {
            const { data } = await api.get('/transactions');
            setTransactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        const confirmed = window.confirm('Delete this trade? This cannot be undone.');
        if (!confirmed) return;
        setDeletingId(id);
        try {
            await api.delete(`/transactions/${id}`);
            setTransactions(prev => prev.filter(t => t.id !== id));
            toast.success('Trade deleted');
        } catch {
            toast.error('Failed to delete transaction');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-white/10 border-t-accent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <PageWrapper>
            <div className="max-w-6xl mx-auto px-6 py-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Transaction History</h1>
                        <p className="text-white/40 text-sm mt-1">{transactions.length} trade{transactions.length !== 1 ? 's' : ''} recorded</p>
                    </div>
                    <Link to="/transactions/new" className="btn-primary text-sm py-2.5 px-5">
                        <Plus size={15} /> New Trade
                    </Link>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-0 overflow-hidden"
                >
                    {transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                                <TrendingUp size={24} className="text-white/30" />
                            </div>
                            <p className="text-white/40 text-sm mb-4">No trades recorded yet.</p>
                            <Link to="/transactions/new" className="btn-primary text-sm py-2 px-5">
                                <Plus size={15} /> Log your first trade
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/[0.06]">
                                        {['Date', 'Type', 'Asset', 'Quantity', 'Price', 'Value', ''].map((h, i) => (
                                            <th key={i} className={`px-6 py-3.5 text-xs font-medium text-white/30 uppercase tracking-wider ${i === 6 ? 'w-12' : 'text-left'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <AnimatePresence>
                                        {transactions.map((t, i) => {
                                            const totalCost = parseFloat(t.quantity) * parseFloat(t.purchase_price);
                                            return (
                                                <motion.tr
                                                    key={t.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, x: -20 }}
                                                    transition={{ delay: 0.04 * i }}
                                                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 text-white/50 text-sm">
                                                            <Calendar size={13} />
                                                            {new Date(t.trade_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`badge ${t.type === 'buy' ? 'badge-success' : 'badge-danger'}`}>
                                                            {t.type === 'buy' ? 'BUY' : 'SELL'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-lg ${t.type === 'buy' ? 'bg-success/20 border border-success/30' : 'bg-danger/20 border border-danger/30'}`}>
                                                                {t.symbol.replace('usd', '').toUpperCase().slice(0, 3)}
                                                            </div>
                                                            <div>
                                                                <p className="text-white text-sm font-semibold">{t.coin_name}</p>
                                                                <p className="text-white/30 text-xs uppercase">{t.symbol}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-white text-sm">{formatNumber(t.quantity, 6)}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-white text-sm">{formatCurrency(parseFloat(t.purchase_price))}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-white text-sm font-semibold">{formatCurrency(totalCost)}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => handleDelete(t.id)}
                                                            disabled={deletingId === t.id}
                                                            className="w-8 h-8 rounded-lg bg-transparent text-white/20 hover:text-danger hover:bg-danger/10 transition-all flex items-center justify-center"
                                                        >
                                                            {deletingId === t.id
                                                                ? <span className="w-3.5 h-3.5 border border-danger/30 border-t-danger rounded-full animate-spin" />
                                                                : <Trash2 size={14} />
                                                            }
                                                        </button>
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
