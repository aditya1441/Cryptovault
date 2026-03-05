import React from 'react';

interface SkeletonCardProps {
    className?: string;
    lines?: number;
}

const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div
        className={`rounded-lg bg-white/[0.04] relative overflow-hidden ${className}`}
        style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
        }}
    />
);

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ className = '' }) => (
    <div className={`card ${className}`}>
        <Shimmer className="h-4 w-24 mb-4" />
        <Shimmer className="h-8 w-36 mb-2" />
        <Shimmer className="h-3 w-20" />
    </div>
);

export const SkeletonRow: React.FC = () => (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.04]">
        <Shimmer className="w-9 h-9 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <Shimmer className="h-3.5 w-28" />
            <Shimmer className="h-2.5 w-16" />
        </div>
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-4 w-20" />
        <Shimmer className="h-6 w-16 rounded-full" />
    </div>
);

export const SkeletonTable: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
    <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
            <Shimmer className="h-4 w-32" />
        </div>
        {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
);
