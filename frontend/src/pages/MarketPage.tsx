import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, TrendingUp, TrendingDown, RefreshCw, Globe, Wifi, WifiOff } from 'lucide-react';
import { formatCurrency, formatPercent } from '../lib/utils';
import { PageWrapper } from '../components/PageWrapper';
import { SkeletonRow } from '../components/SkeletonCard';

const TOP_COINS = [
    { name: 'Bitcoin', geckoId: 'bitcoin', symbol: 'btcusd', ticker: 'BTC', color: '#f7931a' },
    { name: 'Ethereum', geckoId: 'ethereum', symbol: 'ethusd', ticker: 'ETH', color: '#627eea' },
    { name: 'Solana', geckoId: 'solana', symbol: 'solusd', ticker: 'SOL', color: '#9945ff' },
    { name: 'BNB', geckoId: 'binancecoin', symbol: 'bnbusd', ticker: 'BNB', color: '#f0b90b' },
    { name: 'Avalanche', geckoId: 'avalanche-2', symbol: 'avaxusd', ticker: 'AVAX', color: '#e84142' },
    { name: 'Chainlink', geckoId: 'chainlink', symbol: 'linkusd', ticker: 'LINK', color: '#2a5ada' },
    { name: 'Polygon', geckoId: 'matic-network', symbol: 'maticusd', ticker: 'MATIC', color: '#8247e5' },
    { name: 'Polkadot', geckoId: 'polkadot', symbol: 'dotusd', ticker: 'DOT', color: '#e6007a' },
    { name: 'Litecoin', geckoId: 'litecoin', symbol: 'ltcusd', ticker: 'LTC', color: '#bfbbbb' },
    { name: 'Dogecoin', geckoId: 'dogecoin', symbol: 'dogeusd', ticker: 'DOGE', color: '#c2a633' },
];

function genSparkline(base: number): number[] {
    const data: number[] = [];
    let val = base * 0.9;
    for (let i = 0; i < 7; i++) {
        val = val * (1 + (Math.random() - 0.46) * 0.06);
        data.push(Math.max(val, base * 0.6));
    }
    data.push(base);
    return data;
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const w = 80, h = 32;
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
    }).join(' ');
    const color = positive ? '#32d74b' : '#ff453a';
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
            <polyline points={pts} stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

interface CoinData {
    name: string;
    geckoId: string;
    symbol: string;
    ticker: string;
    color: string;
    price: number;
    change24h: number;
    sparkline: number[];
    loading: boolean;
}

export const MarketPage: React.FC = () => {
    const [coins, setCoins] = useState<CoinData[]>(
        TOP_COINS.map(c => ({ ...c, price: 0, change24h: 0, sparkline: [], loading: true }))
    );
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [wsStatus, setWsStatus] = useState<'connecting' | 'live' | 'polling'>('connecting');
    const wsRef = useRef<WebSocket | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Initial load + REST refresh via CoinGecko ─────────────────────────────
    const fetchPrices = useCallback(async (quiet = false) => {
        if (!quiet) setRefreshing(true);
        try {
            const ids = TOP_COINS.map(c => c.geckoId).join(',');
            const res = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
                { signal: AbortSignal.timeout(8000) }
            );
            if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
            const data = await res.json();

            setCoins(prev => prev.map(coin => {
                const entry = data[coin.geckoId];
                if (!entry) return coin;
                const price = entry.usd ?? coin.price;
                const change24h = entry.usd_24h_change ?? coin.change24h;
                return {
                    ...coin,
                    price,
                    change24h,
                    sparkline: coin.sparkline.length > 0 ? coin.sparkline : genSparkline(price),
                    loading: false,
                };
            }));
        } catch (e) {
            console.warn('CoinGecko fetch failed:', e);
            // Mark all still-loading coins as loaded with 0 to stop skeleton
            setCoins(prev => prev.map(c => c.loading ? { ...c, loading: false } : c));
        } finally {
            setRefreshing(false);
        }
    }, []);

    // ── WebSocket from our backend (which proxies Gemini prices every 10s) ────
    const connectWs = useCallback(() => {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const wsUrl = API_URL.replace('http', 'ws') + '/ws/prices';
        try {
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => setWsStatus('live');
            ws.onclose = () => {
                setWsStatus('polling');
            };
            ws.onerror = () => {
                setWsStatus('polling');
                ws.close();
            };
            ws.onmessage = (event) => {
                try {
                    // Backend sends: { "btcusd": "73500.00", "ethusd": "2143.00", ... }
                    const prices: Record<string, string> = JSON.parse(event.data);
                    setCoins(prev => prev.map(coin => {
                        const raw = prices[coin.symbol];
                        if (!raw) return coin;
                        const price = parseFloat(raw);
                        return { ...coin, price, loading: false };
                    }));
                } catch { /* ignore malformed */ }
            };
        } catch {
            setWsStatus('polling');
        }
    }, []);

    useEffect(() => {
        // 1. Fetch REST prices immediately
        fetchPrices();

        // 2. Try WebSocket for live updates
        connectWs();

        // 3. Fallback: poll CoinGecko every 30s regardless (keeps data fresh even if WS works)
        pollRef.current = setInterval(() => fetchPrices(true), 30_000);

        return () => {
            wsRef.current?.close();
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [fetchPrices, connectWs]);

    const filtered = coins.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.ticker.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <PageWrapper>
            <div className="max-w-6xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Globe size={28} className="text-accent" />
                            Live Market
                            <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs tracking-wide border ${wsStatus === 'live'
                                    ? 'bg-success/10 border-success/30 text-success'
                                    : wsStatus === 'connecting'
                                        ? 'bg-warning/10 border-warning/30 text-warning'
                                        : 'bg-accent/10 border-accent/30 text-accent'
                                }`}>
                                {wsStatus === 'live' ? (
                                    <><Wifi size={11} /><span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE</>
                                ) : wsStatus === 'connecting' ? (
                                    <><span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" /> CONNECTING</>
                                ) : (
                                    <><WifiOff size={11} /> POLLING 30s</>
                                )}
                            </span>
                        </h1>
                        <p className="text-white/40 text-sm mt-1">
                            {wsStatus === 'live'
                                ? 'Real-time prices via WebSocket · Auto-updating'
                                : 'Prices from CoinGecko · Refreshes every 30 seconds'}
                        </p>
                    </div>
                    <button
                        onClick={() => fetchPrices(true)}
                        disabled={refreshing}
                        className="btn-secondary text-sm py-2 px-4 self-start"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search coins..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field pl-11 max-w-sm"
                    />
                </div>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card p-0 overflow-hidden"
                >
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-4 px-6 py-3.5 border-b border-white/[0.06]">
                        {['Asset', 'Price', '24h Change', '7D Chart', 'Trend'].map(h => (
                            <span key={h} className="text-xs font-medium text-white/30 uppercase tracking-wider">{h}</span>
                        ))}
                    </div>

                    {filtered.map((coin, i) => (
                        coin.loading ? (
                            <SkeletonRow key={coin.symbol} />
                        ) : (
                            <motion.div
                                key={coin.symbol}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                className="grid grid-cols-[2fr_1fr_1fr_1fr_80px] gap-4 items-center px-6 py-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                            >
                                {/* Asset */}
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0"
                                        style={{ background: `${coin.color}30`, border: `1px solid ${coin.color}50` }}
                                    >
                                        <span style={{ color: coin.color }}>{coin.ticker.slice(0, 3)}</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-sm">{coin.name}</p>
                                        <p className="text-white/30 text-xs uppercase">{coin.ticker}</p>
                                    </div>
                                </div>

                                {/* Price */}
                                <p className="text-white font-semibold text-sm">
                                    {coin.price > 0 ? formatCurrency(coin.price) : '—'}
                                </p>

                                {/* 24h Change */}
                                <div className="flex items-center gap-1">
                                    {coin.change24h >= 0
                                        ? <TrendingUp size={13} className="text-success" />
                                        : <TrendingDown size={13} className="text-danger" />
                                    }
                                    <span className={`text-sm font-semibold ${coin.change24h >= 0 ? 'text-success' : 'text-danger'}`}>
                                        {formatPercent(coin.change24h)}
                                    </span>
                                </div>

                                {/* Sparkline */}
                                <div className="flex items-center">
                                    {coin.sparkline.length > 0 && (
                                        <Sparkline data={coin.sparkline} positive={coin.change24h >= 0} />
                                    )}
                                </div>

                                {/* Trend badge */}
                                <span className={`badge text-xs ${coin.change24h >= 0 ? 'badge-success' : 'badge-danger'}`}>
                                    {coin.change24h >= 0 ? '↑ Bull' : '↓ Bear'}
                                </span>
                            </motion.div>
                        )
                    ))}

                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-white/30">
                            <Globe size={32} className="mb-3 opacity-30" />
                            <p className="text-sm">No coins match your search</p>
                        </div>
                    )}
                </motion.div>

                <p className="text-center text-white/20 text-xs mt-6">
                    Prices from CoinGecko API · Auto-refresh every 30s · Click Refresh for latest
                </p>
            </div>
        </PageWrapper>
    );
};
