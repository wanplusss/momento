import React from 'react';
import type { Goal, Session } from '../types';
import { getWMAFromValues, getStdDev, getHeikenAshi } from '../utils/calculations';
import { ChevronLeft } from 'lucide-react';
import {
    ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Area, Line, Scatter
} from 'recharts';

interface TechnicalProps {
    goal: Goal;
    sessions: Session[];
    onBack: () => void;
}

const Technical: React.FC<TechnicalProps> = ({ goal, sessions, onBack }) => {
    const sortedSessions = [...sessions].sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
    const historyValues = sortedSessions.map(s => s.finalCount);

    // Performance Range data
    const rangeData = historyValues.map((v, i) => {
        const slice = historyValues.slice(0, i + 1);
        const wma = getWMAFromValues(slice, goal.movingAverageWindow);
        const stdDev = getStdDev(slice, goal.movingAverageWindow);
        return {
            i,
            v,
            wma,
            upper: wma + (stdDev * 1.5),
            lower: wma - (stdDev * 1.5),
        };
    });

    // Recommendation logic
    const wma = sortedSessions.length
        ? getWMAFromValues(historyValues, goal.movingAverageWindow)
        : goal.baseline;
    const recommendation = Math.round(wma);

    // Heiken-Ashi data
    const haData = getHeikenAshi(historyValues);
    const maxHigh = haData.length ? Math.max(...haData.map(h => h.high)) : 100;

    return (
        <div className="container animate-fade-in" style={{ minHeight: '100vh', paddingBottom: '6rem', paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button onClick={onBack} className="btn-icon" style={{ background: 'var(--color-surface)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                    <ChevronLeft size={20} />
                </button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>Deep Dive</h2>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Performance Range */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div className="label" style={{ letterSpacing: '0.1em', marginBottom: 0 }}>Performance Range</div>
                    </div>
                    <div style={{ height: '12rem', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={rangeData}>
                                <XAxis dataKey="i" hide />
                                <YAxis hide domain={['dataMin-10', 'dataMax+10']} />
                                <Tooltip contentStyle={{ background: '#18181b', border: 'none', fontSize: '10px', color: '#fff', borderRadius: '8px' }} />
                                <Area type="monotone" dataKey="upper" stroke="none" fill="#6366f1" fillOpacity={0.1} />
                                <Area type="monotone" dataKey="lower" stroke="none" fill="#6366f1" fillOpacity={0} />
                                <Line type="monotone" dataKey="wma" stroke="#6366f1" strokeWidth={2} dot={false} />
                                <Scatter dataKey="v" fill="#fff" r={4} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                    <p style={{ fontSize: '0.625rem', color: 'var(--color-text-tertiary)', marginTop: '0.5rem', textAlign: 'center' }}>
                        "Stay within the shaded area to maintain consistency."
                    </p>
                </div>

                {/* Motivation Trend (Heiken-Ashi) */}
                <div className="card">
                    <div className="label" style={{ letterSpacing: '0.1em', marginBottom: '1.5rem' }}>Motivation Trend</div>
                    <div style={{ height: '8rem', display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
                        {haData.slice(-15).map((c, i) => {
                            const maxH = maxHigh * 1.2 || 1;
                            const bodyHeight = Math.max(2, Math.abs(c.close - c.open) * 2);
                            const bodyBottom = (Math.min(c.close, c.open) / maxH) * 100;

                            return (
                                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', height: '100%' }}>
                                    {/* Wick */}
                                    <div style={{
                                        position: 'absolute',
                                        width: 1,
                                        background: 'var(--color-border)',
                                        height: `${Math.max(4, (c.high - c.low) * 2)}px`,
                                        bottom: `${(c.low / maxH) * 100}%`
                                    }} />
                                    {/* Body */}
                                    <div style={{
                                        position: 'absolute',
                                        width: '100%',
                                        borderRadius: 2,
                                        zIndex: 10,
                                        background: c.isBull ? 'var(--color-success)' : 'var(--color-danger)',
                                        height: `${bodyHeight}px`,
                                        bottom: `${bodyBottom}%`
                                    }} />
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                        <span className="label" style={{ marginBottom: 0 }}>Past</span>
                        <span className="label" style={{ marginBottom: 0 }}>Now</span>
                    </div>
                </div>

                {/* Recommendation Card */}
                <div className="card">
                    <div className="label" style={{ letterSpacing: '0.1em', marginBottom: '1rem', color: 'var(--color-brand-400)' }}>Adaptive Suggestion</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <div style={{ fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{recommendation}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{goal.unit}</div>
                        </div>
                        <div style={{ textAlign: 'right', maxWidth: '60%' }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', margin: 0 }}>
                                Based on your recent performance, this is your recommended target for the next session.
                            </p>
                        </div>
                    </div>
                </div>

                {/* History Table */}
                <div className="card">
                    <div className="label" style={{ letterSpacing: '0.1em', marginBottom: '1rem' }}>Session History</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.5rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                            <div>Date</div>
                            <div style={{ textAlign: 'center' }}>Result</div>
                            <div style={{ textAlign: 'right' }}>Zone</div>
                        </div>
                        {[...sortedSessions].reverse().slice(0, 10).map(s => (
                            <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '0.75rem 0.5rem', alignItems: 'center', fontSize: '0.875rem' }}>
                                <div style={{ color: 'var(--color-text-secondary)' }}>
                                    {new Date(s.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                                <div style={{ textAlign: 'center', fontWeight: 700 }}>
                                    {s.finalCount} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-tertiary)' }}>{goal.unit}</span>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span className={`badge ${['Stretch', 'BEYOND'].includes(s.tier || '') ? 'badge-success' : 'badge-slate'}`} style={{ fontSize: '0.75rem', textTransform: 'capitalize' }}>
                                        {s.tier || '-'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Technical;
