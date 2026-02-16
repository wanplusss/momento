import React from 'react';

interface LineData {
    label: string;
    value: number;
    average: number;
}

const LineChart: React.FC<{ data: LineData[] }> = ({ data }) => {
    if (data.length === 0) return <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>No data yet.</p>;

    const allVals = data.flatMap(d => [d.value, d.average]);
    const max = Math.max(...allVals, 1);
    const min = Math.min(...allVals, 0);
    const range = max - min || 1;
    const h = 120;
    const w = 300;

    const toY = (v: number) => h - ((v - min) / range) * (h - 10) - 5;
    const toX = (i: number) => (i / Math.max(data.length - 1, 1)) * w;

    const valuePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.value)}`).join(' ');
    const avgPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(d.average)}`).join(' ');

    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h }}>
            <path d={valuePath} fill="none" stroke="var(--color-brand-500)" strokeWidth="2" />
            <path d={avgPath} fill="none" stroke="var(--color-teal)" strokeWidth="1.5" strokeDasharray="4 3" />
        </svg>
    );
};

export default LineChart;
