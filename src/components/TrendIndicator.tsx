import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

interface TrendIndicatorProps {
    percent: number;
    direction: 'up' | 'down' | 'neutral';
}

const TrendIndicator: React.FC<TrendIndicatorProps> = ({ percent, direction }) => {
    // Up is generally good in this app (more sessions, higher count)
    // Down is generally bad

    if (direction === 'neutral') {
        return (
            <div className="flex items-center gap-1 text-xs text-muted">
                <Minus size={14} />
                <span>0%</span>
            </div>
        );
    }

    const isUp = direction === 'up';
    const colorClass = isUp ? 'text-brand' : 'text-danger'; // brand is green-ish, danger is red
    const Icon = isUp ? ArrowUpRight : ArrowDownRight;

    // Style: simple text with icon
    return (
        <div className={`flex items-center gap-1 text-xs font-medium ${colorClass}`}>
            <Icon size={14} />
            <span>{percent}%</span>
        </div>
    );
};

export default TrendIndicator;
