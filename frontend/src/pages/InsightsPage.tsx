import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, TrendingDown, Shield, Zap, RefreshCw, ChevronRight, Brain } from 'lucide-react';
import { api } from '../lib/api';
import { formatCurrency, formatPercent } from '../lib/utils';
import { PageWrapper } from '../components/PageWrapper';
import { SkeletonCard } from '../components/SkeletonCard';

interface Holding {
    symbol: string;
    coin_name: string;
    pnl: string;
    pnl_pct: string;
    current_value: string;
    total_invested: string;
}

interface Portfolio {
    total_invested: string;
    total_current_value: string;
    total_pnl: string;
    total_pnl_pct: string;
    holdings: Holding[];
}

interface Insight {
    id: string;
    type: 'tip' | 'warning' | 'celebration' | 'info';
    title: string;
    description: string;
    icon: React.ReactNode;
}

const RISK_RULES = [
    { max: 30, label: 'Conservative', color: 'text-success', bg: 'bg-success', desc: 'Well diversified with low concentration risk.' },
    { max: 60, label: 'Balanced', color: 'text-warning', bg: 'bg-warning', desc: 'Good balance, slight concentration in top holdings.' },
    { max: 100, label: 'Aggressive', color: 'text-danger', bg: 'bg-danger', desc: 'High concentration risk — consider diversifying.' },
];

function getRiskScore(holdings: Holding[]): number {
    if (!holdings || holdings.length === 0) return 0;
    const totalValue = holdings.reduce((s, h) => s + parseFloat(h.current_value || '0'), 0);
    if (totalValue === 0) return 0;
    const topWeight = Math.max(...holdings.map(h => (parseFloat(h.current_value || '0') / totalValue) * 100));
    return Math.round(topWeight);
}

function generateInsights(portfolio: Portfolio): Insight[] {
    const insights: Insight[] = [];
    const holdings = portfolio.holdings || [];
    const totalPnl = parseFloat(portfolio.total_pnl || '0');
    const totalPnlPct = parseFloat(portfolio.total_pnl_pct || '0');
    const totalValue = parseFloat(portfolio.total_current_value || '0');
    const totalInvested = parseFloat(portfolio.total_invested || '0');

    // Best performer
    if (holdings.length > 0) {
        const best = [...holdings].sort((a, b) => parseFloat(b.pnl_pct) - parseFloat(a.pnl_pct))[0];
        const worst = [...holdings].sort((a, b) => parseFloat(a.pnl_pct) - parseFloat(b.pnl_pct))[0];
        const bestPct = parseFloat(best.pnl_pct);
        const worstPct = parseFloat(worst.pnl_pct);

        if (bestPct > 10) {
            insights.push({
                id: 'best',
                type: 'celebration',
                title: `🏆 ${best.coin_name} is your star performer`,
                description: `${best.coin_name} is up ${bestPct.toFixed(1)}%. Consider locking in some gains if it represents more than 40% of your portfolio.`,
                icon: <TrendingUp size={18} className="text-success" />,
            });
        }

        if (worstPct < -5 && worst.symbol !== best.symbol) {
            insights.push({
                id: 'worst',
                type: 'warning',
                title: `⚠️ ${worst.coin_name} needs attention`,
                description: `${worst.coin_name} is down ${Math.abs(worstPct).toFixed(1)}%. Evaluate whether this aligns with your long-term strategy or if cutting losses is wise.`,
                icon: <TrendingDown size={18} className="text-danger" />,
            });
        }
    }

    // Overall P&L
    if (totalPnl > 0 && totalPnlPct > 5) {
        insights.push({
            id: 'pnl-positive',
            type: 'tip',
            title: `Portfolio up ${formatPercent(totalPnlPct)} all time`,
            description: `You're currently up ${formatCurrency(totalPnl)} from your initial investment. Your crypto strategy is working well — stay disciplined.`,
            icon: <Sparkles size={18} className="text-warning" />,
        });
    } else if (totalPnl < 0) {
        insights.push({
            id: 'pnl-negative',
            type: 'info',
            title: `Portfolio is temporarily down ${formatPercent(Math.abs(totalPnlPct))}`,
            description: `Down periods are normal in crypto markets. Dollar-cost averaging (DCA) into quality assets during dips is historically a winning strategy.`,
            icon: <Shield size={18} className="text-accent" />,
        });
    }

    // Diversification
    if (holdings.length === 1) {
        insights.push({
            id: 'diversify',
            type: 'warning',
            title: '🎯 Consider diversifying your portfolio',
            description: `You only hold ${holdings[0].coin_name}. Spreading across 3-5 assets can reduce risk significantly without sacrificing much upside.`,
            icon: <Zap size={18} className="text-warning" />,
        });
    }

    // Cash vs invested insight
    if (totalValue > totalInvested * 1.5) {
        insights.push({
            id: 'gains',
            type: 'tip',
            title: '💰 Strong portfolio growth detected',
            description: `Your portfolio has grown to ${Math.round((totalValue / totalInvested - 1) * 100)}% of your initial investment. Consider taking profits on 10-20% to secure gains.`,
            icon: <Sparkles size={18} className="text-success" />,
        });
    }

    if (insights.length === 0) {
        insights.push({
            id: 'default',
            type: 'info',
            title: '📊 Keep tracking your portfolio',
            description: 'Add more trades to get personalized insights and smart AI-powered recommendations for your crypto strategy.',
            icon: <Brain size={18} className="text-accent" />,
        });
    }

    return insights;
}

const typeStyles: Record<string, string> = {
    celebration: 'border-success/20 bg-success/[0.04]',
    warning: 'border-warning/20 bg-warning/[0.04]',
    tip: 'border-accent/20 bg-accent/[0.04]',
    info: 'border-white/10 bg-white/[0.02]',
};

export const InsightsPage: React.FC = () => {
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // AI context
    const [aiInsight, setAiInsight] = useState<{ summary: string; sentiment: string } | null>(null);
    const [aiLoading, setAiLoading] = useState(true);

    const fetchPortfolio = async (quiet = false) => {
        if (!quiet) setLoading(true);
        else setRefreshing(true);
        try {
            const { data } = await api.get('/portfolio');
            setPortfolio(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchAiInsights = async () => {
        setAiLoading(true);
        try {
            const { data } = await api.get('/insights/ai');
            setAiInsight(data);
        } catch (err) {
            console.error("Failed to fetch AI insights", err);
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        fetchPortfolio();
        fetchAiInsights();
    }, []);

    const insights = portfolio ? generateInsights(portfolio) : [];
    const riskScore = portfolio ? getRiskScore(portfolio.holdings) : 0;
    const riskLevel = RISK_RULES.find(r => riskScore <= r.max) ?? RISK_RULES[2];

    return (
        <PageWrapper>
            <div className="max-w-4xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Brain size={28} className="text-accent" />
                            AI Insights
                        </h1>
                        <p className="text-white/40 text-sm mt-1">Smart analysis of your crypto portfolio</p>
                    </div>
                    <button
                        onClick={() => fetchPortfolio(true)}
                        disabled={refreshing}
                        className="btn-secondary text-sm py-2 px-4"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : (
                    <>
                        {/* Genuine AI Summary Card */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="card mb-6 border-brand-light/30 bg-brand-light/[0.03] relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-light to-purple-500" />
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-white flex items-center gap-2">
                                    <Sparkles size={18} className="text-brand-light" />
                                    OpenAI Portfolio Analysis
                                </h2>
                                {!aiLoading && aiInsight && (
                                    <span className={`badge ${aiInsight.sentiment === 'bullish' ? 'badge-success' :
                                            aiInsight.sentiment === 'bearish' ? 'badge-danger' :
                                                'badge-info'
                                        }`}>
                                        Market Sentiment: {aiInsight.sentiment.toUpperCase()}
                                    </span>
                                )}
                            </div>

                            {aiLoading ? (
                                <div className="space-y-2">
                                    <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
                                    <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
                                    <div className="h-4 bg-white/5 rounded w-4/6 animate-pulse" />
                                </div>
                            ) : aiInsight ? (
                                <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
                                    {aiInsight.summary}
                                </p>
                            ) : (
                                <p className="text-white/40 text-sm">Failed to load AI insights. Add more trades or check back later.</p>
                            )}
                        </motion.div>

                        {/* Risk Score Card */}
                        {portfolio && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="card mb-6"
                            >
                                <div className="flex items-start justify-between mb-5">
                                    <div>
                                        <p className="text-white/40 text-sm mb-1">Portfolio Risk Score</p>
                                        <h2 className={`text-4xl font-bold ${riskLevel.color}`}>{riskScore}%</h2>
                                        <p className="text-white/60 text-sm mt-1 font-medium">{riskLevel.label} · {riskLevel.desc}</p>
                                    </div>
                                    <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${riskLevel.color} border-current bg-current/10`}>
                                        {riskLevel.label}
                                    </div>
                                </div>
                                {/* Progress bar */}
                                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${riskScore}%` }}
                                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                                        className={`h-full rounded-full ${riskLevel.bg}`}
                                    />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-white/20 text-xs">Low Risk</span>
                                    <span className="text-white/20 text-xs">High Risk</span>
                                </div>

                                {/* Portfolio summary pills */}
                                <div className="grid grid-cols-3 gap-3 mt-5">
                                    {[
                                        { label: 'Total Value', val: formatCurrency(parseFloat(portfolio.total_current_value || '0')) },
                                        { label: 'Total Invested', val: formatCurrency(parseFloat(portfolio.total_invested || '0')) },
                                        { label: 'All-Time P&L', val: formatPercent(parseFloat(portfolio.total_pnl_pct || '0')) },
                                    ].map(pill => (
                                        <div key={pill.label} className="bg-white/[0.03] rounded-xl p-3 text-center">
                                            <p className="text-white/30 text-xs mb-1">{pill.label}</p>
                                            <p className="text-white font-semibold text-sm">{pill.val}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* Rule-Based Insights Cards */}
                        <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4 mt-6">
                            {insights.length} Algorithmic Insight{insights.length !== 1 ? 's' : ''}
                        </h2>
                        <AnimatePresence>
                            <div className="space-y-3">
                                {insights.map((insight, i) => (
                                    <motion.div
                                        key={insight.id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        className={`card flex items-start gap-4 border-l-4 ${typeStyles[insight.type]}`}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {insight.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-white text-sm mb-1">{insight.title}</p>
                                            <p className="text-white/50 text-sm leading-relaxed">{insight.description}</p>
                                        </div>
                                        <ChevronRight size={16} className="text-white/20 flex-shrink-0 mt-1" />
                                    </motion.div>
                                ))}
                            </div>
                        </AnimatePresence>

                        {/* Holdings breakdown */}
                        {portfolio && portfolio.holdings.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="card mt-6"
                            >
                                <h3 className="font-semibold text-white mb-4">Portfolio Allocation</h3>
                                <div className="space-y-3">
                                    {[...portfolio.holdings]
                                        .sort((a, b) => parseFloat(b.current_value) - parseFloat(a.current_value))
                                        .map(h => {
                                            const totalVal = portfolio.holdings.reduce(
                                                (s, hh) => s + parseFloat(hh.current_value || '0'), 0
                                            );
                                            const weight = totalVal > 0
                                                ? (parseFloat(h.current_value || '0') / totalVal) * 100
                                                : 0;
                                            const pnlPos = parseFloat(h.pnl) >= 0;
                                            return (
                                                <div key={h.symbol}>
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className="text-sm text-white font-medium">{h.coin_name}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-xs font-semibold ${pnlPos ? 'text-success' : 'text-danger'}`}>
                                                                {pnlPos ? '+' : ''}{h.pnl_pct}%
                                                            </span>
                                                            <span className="text-white/40 text-sm">{weight.toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                    <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${weight}%` }}
                                                            transition={{ duration: 1, ease: 'easeOut' }}
                                                            className="h-full rounded-full bg-accent"
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </motion.div>
                        )}
                    </>
                )}

                <p className="text-center text-white/20 text-xs mt-8">
                    Insights are algorithmically generated and not financial advice
                </p>
            </div>
        </PageWrapper>
    );
};
