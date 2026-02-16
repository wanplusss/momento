import React from 'react';
import type { Tier } from '../../types';

const tierColors: Record<Tier, string> = {
    below: '#3f3f46',
    baseline: 'var(--color-teal)',
    momentum: 'var(--color-brand-500)',
    stretch: 'var(--color-purple)',
    beyond: 'var(--color-warning)',
};

const TierBreakdown: React.FC<{ distribution: Record<Tier, number>; total: number }> = ({ distribution, total }) => {
    if (total === 0) return <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>No sessions yet.</p>;

    return (
        <div style={{ display: 'flex', height: 20, borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            {(Object.keys(distribution) as Tier[]).map(tier => {
                const pct = (distribution[tier] / total) * 100;
                if (pct === 0) return null;
                return (
                    <div key={tier} style={{
                        width: `${pct}%`,
                        background: tierColors[tier],
                        transition: 'width 0.3s ease',
                    }} />
                );
            })}
        </div>
    );
};

export default TierBreakdown;
