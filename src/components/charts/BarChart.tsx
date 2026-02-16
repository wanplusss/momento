import React from 'react';

interface BarData {
    label: string;
    value: number;
    tier: string;
}

const tierColor = (tier: string): string => {
    switch (tier) {
        case 'beyond': return 'var(--color-warning)';
        case 'stretch': return 'var(--color-purple)';
        case 'momentum': return 'var(--color-brand-500)';
        case 'baseline': return 'var(--color-teal)';
        default: return 'var(--color-text-tertiary)';
    }
};

const BarChart: React.FC<{ data: BarData[] }> = ({ data }) => {
    if (data.length === 0) return <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>No sessions yet.</p>;
    const max = Math.max(...data.map(d => d.value), 1);

    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
            {data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{
                        width: '100%', borderRadius: 3,
                        height: Math.max(4, (d.value / max) * 100),
                        background: tierColor(d.tier),
                        transition: 'height 0.2s ease',
                    }} />
                    {i % 4 === 0 && <span style={{ fontSize: '0.5rem', color: 'var(--color-text-tertiary)' }}>{d.label}</span>}
                </div>
            ))}
        </div>
    );
};

export default BarChart;
