import React from 'react';
import CountUp from 'react-countup';

interface AnimatedNumberProps {
    value: number;
    prefix?: string;
    suffix?: string;
    decimals?: number;
    duration?: number;
    className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
    value,
    prefix = '',
    suffix = '',
    decimals = 2,
    duration = 1.4,
    className = '',
}) => (
    <CountUp
        end={value}
        prefix={prefix}
        suffix={suffix}
        decimals={decimals}
        duration={duration}
        separator=","
        useEasing
        className={className}
    />
);
