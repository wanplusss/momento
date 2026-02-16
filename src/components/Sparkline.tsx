import React from 'react';

interface SparklineProps {
    data: number[];
    color?: string;
    width?: number;
    height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({
    data,
    color = 'var(--color-brand-500)',
    width = 60,
    height = 20
}) => {
    if (!data || data.length < 2) {
        return <div style={{ width, height, background: 'var(--color-gray-800)', borderRadius: 2 }} />;
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1; // avoid divide by zero

    const points = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        // Invert Y because SVG 0 is top
        const y = height - ((d - min) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
            <polyline
                points={points}
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default Sparkline;
